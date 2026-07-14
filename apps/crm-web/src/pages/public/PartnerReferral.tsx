import { useState, useEffect } from 'react';
import * as dateUtils from '../../utils/dateUtils';
import { useParams } from 'react-router-dom';
import { referralsApi } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import {
    CheckCircle, User, Phone, Mail, MapPin,
    MessageSquare, Building2, Send, ShieldCheck,
    ChevronRight, ArrowLeft
} from 'lucide-react';

export default function PartnerReferral() {
    const { partnerId } = useParams();
    const { showToast } = useToast();
    const [partner, setPartner] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const [form, setForm] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',
        project_id: '',
        property_type: '2BHK',
        budget: '',
        notes: ''
    });

    useEffect(() => {
        const loadInfo = async () => {
            try {
                const [pData, projectsRes] = await Promise.all([
                    referralsApi.getPartner(partnerId),
                    referralsApi.getProjects()
                ]);
                setPartner(pData);
                setProjects(projectsRes || []);
            } catch (err: any) {
                console.error('Partner Info Load Error:', err);
                setError(err.error || 'Invalid referral link or partner no longer active.');
            } finally {
                setLoading(false);
            }
        };
        loadInfo();
    }, [partnerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.phone) {
            showToast('Please provide at least Name and Phone.', 'error');
            return;
        }
        setSubmitting(true);
        try {
            await referralsApi.submit({ ...form, partner_id: partnerId });
            setSubmitted(true);
            showToast('Referral submitted successfully!', 'success');
        } catch (err: any) {
            showToast(err.error || 'Submission failed. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="card max-w-md w-full text-center p-8 shadow-xl">
                <div className="text-rose-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold mb-2 text-navy-900">Access Denied</h2>
                <p className="text-slate-600 mb-6">{error}</p>
                <button
                    onClick={() => window.location.href = '/'}
                    className="btn btn-primary w-full"
                >
                    Return to Home
                </button>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
            <div className="card max-w-md w-full text-center p-10 shadow-2xl border-none" style={{ borderRadius: 24 }}>
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-extrabold mb-3 text-navy-900">Thank You!</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Your referral for <strong>{form.name}</strong> has been successfully submitted to the <strong>{partner?.name}</strong> network. Our team will take it from here!
                </p>
                <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left border border-slate-100">
                    <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Submitted By</div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-600 font-bold">
                            {partner?.avatar || 'CP'}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-navy-800">{partner?.name}</div>
                            <div className="text-xs text-slate-500">{partner?.company}</div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setSubmitted(false)}
                    className="btn btn-ghost text-slate-400 hover:text-navy-600"
                >
                    Submit Another Referral
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
            {/* Header / Hero */}
            <div style={{
                background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-700) 100%)',
                padding: '40px 20px 100px',
                textAlign: 'center'
            }}>
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-xs font-bold uppercase tracking-widest border border-white/10 flex items-center gap-2">
                            <ShieldCheck size={14} /> Official Referral Portal
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Grow Together with {partner?.name}
                    </h1>
                    <p className="text-white/70 text-lg max-w-2xl mx-auto font-medium">
                        Refer a lead to our ecosystem and track high-tier real estate opportunities for your network.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl w-full mx-auto px-6 -mt-16 pb-20">
                <div className="grid md:grid-cols-5 gap-8">

                    {/* Form Side */}
                    <div className="md:col-span-3">
                        <div className="card p-8 shadow-2xl border-none shadow-navy-900/10" style={{ borderRadius: 24 }}>
                            <div className="mb-8">
                                <h3 className="text-xl font-extrabold text-navy-900 mb-2">Lead Information</h3>
                                <p className="text-slate-500 text-sm">Please provide accurate details for the referred client.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">Client Name *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-slate-400"><User size={18} /></span>
                                            <input
                                                className="form-control pl-10 h-12 border-slate-200 focus:border-navy-500"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">Phone Number *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-slate-400"><Phone size={18} /></span>
                                            <input
                                                className="form-control pl-10 h-12 border-slate-200 focus:border-navy-500"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                placeholder="+91 00000 00000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label font-bold text-navy-700">Email Address (Optional)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-slate-400"><Mail size={18} /></span>
                                        <input
                                            className="form-control pl-10 h-12 border-slate-200 focus:border-navy-500"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            placeholder="client@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">City</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-slate-400"><MapPin size={18} /></span>
                                            <input
                                                className="form-control pl-10 h-12 border-slate-200 focus:border-navy-500"
                                                value={form.city}
                                                onChange={e => setForm({ ...form, city: e.target.value })}
                                                placeholder="Mumbai, Pune, etc."
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">Project Interest</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-slate-400"><Building2 size={18} /></span>
                                            <select
                                                className="form-control pl-10 h-12 border-slate-200 focus:border-navy-500"
                                                value={form.project_id}
                                                onChange={e => setForm({ ...form, project_id: e.target.value })}
                                            >
                                                <option value="">Any Project</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">Property Type</label>
                                        <select
                                            className="form-control h-12 border-slate-200 focus:border-navy-500"
                                            value={form.property_type}
                                            onChange={e => setForm({ ...form, property_type: e.target.value })}
                                        >
                                            <option>1BHK</option>
                                            <option>2BHK</option>
                                            <option>3BHK</option>
                                            <option>4BHK</option>
                                            <option>Villa</option>
                                            <option>Penthouse</option>
                                            <option>Commercial</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label font-bold text-navy-700">Budget Range</label>
                                        <input
                                            className="form-control h-12 border-slate-200 focus:border-navy-500"
                                            value={form.budget}
                                            onChange={e => setForm({ ...form, budget: e.target.value })}
                                            placeholder="e.g. ₹85L - ₹1.2Cr"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label font-bold text-navy-700">Additional Notes</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-slate-400"><MessageSquare size={18} /></span>
                                        <textarea
                                            className="form-control pl-10 border-slate-200 focus:border-navy-500"
                                            rows={4}
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            placeholder="Mention specific requirements..."
                                        />
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary w-full h-14 text-lg font-bold shadow-xl shadow-navy-600/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting...' : (
                                        <>Submit Referral <Send size={18} /></>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Partner Sidebar */}
                    <div className="md:col-span-2">
                        <div className="card p-6 shadow-xl border-white bg-white/50 backdrop-blur-sm sticky top-6" style={{ borderRadius: 24 }}>
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-400 flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg">
                                    {partner?.avatar || 'CP'}
                                </div>
                                <h4 className="text-xl font-extrabold text-navy-900">{partner?.name}</h4>
                                <div className="text-sm text-slate-500 font-medium mb-1">{partner?.company}</div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-navy-100 text-navy-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <ShieldCheck size={12} /> Verified Partner
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-slate-200/60">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle size={14} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-navy-800">Priority Processing</div>
                                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Leads submitted via {partner?.name}'s network are treated as high priority.
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">
                                        <Building2 size={14} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-navy-800">Exclusive Inventory</div>
                                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Direct access to pre-launch and blocked units for partners.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-navy-900 rounded-2xl text-white">
                                <h5 className="text-sm font-bold mb-2 flex items-center gap-2">
                                    <ArrowLeft size={14} /> Referral Tips
                                </h5>
                                <ul className="text-[11px] space-y-2 opacity-80 font-medium">
                                    <li>• Verify phone number for faster contact</li>
                                    <li>• Matching budget helps in better projects</li>
                                    <li>• Notes help our agents prepare better</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto py-8 text-center text-slate-400 text-xs font-medium">
                © {dateUtils.getNow().getFullYear()} ZentrixCRM Referral Ecosystem. All Leads Encrypted &amp; Secure.
            </div>
        </div>
    );
}
