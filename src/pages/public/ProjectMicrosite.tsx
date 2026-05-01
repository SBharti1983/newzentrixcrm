import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
    MapPin, Home, Info, Download, Phone, Mail, User, 
    Send, CheckCircle, ShieldCheck, Globe, Star, Users,
    ArrowRight, Eye, Layout, FileText
} from 'lucide-react';
import axios from 'axios';
import ProjectChatbot from '../../components/public/ProjectChatbot';

interface ProjectData {
    project: {
        id: string;
        name: string;
        location: string;
        description: string;
        amenities?: string;
        property_type?: string;
        image_url?: string;
    };
    assets: Array<{
        name: string;
        type: string;
        file_url: string;
    }>;
    tenant: {
        name: string;
        logo_url?: string;
        primary_color?: string;
    };
}

const ProjectMicrosite: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
        source: searchParams.get('source') || 'Public Microsite'
    });

    const primaryColor = data?.tenant?.primary_color || '#6366f1';

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const hostname = window.location.hostname;
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/public/projects/${projectId}?hostname=${hostname}`);
                setData(response.data);
            } catch (err) {
                console.error('Failed to load project:', err);
                setError('Project not found or link expired.');
            } finally {
                setLoading(false);
            }
        };

        if (projectId) fetchProject();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const hostname = window.location.hostname;
            const cp = searchParams.get('cp');
            const referrer = searchParams.get('referrer');
            let url = `${import.meta.env.VITE_API_URL}/public/projects/${projectId}/enquiry?hostname=${hostname}`;
            if (cp) url += `&cp=${cp}`;
            if (referrer) url += `&referrer=${referrer}`;
            
            await axios.post(url, formData);
            setSubmitted(true);
        } catch (err) {
            alert('Failed to submit enquiry. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <Info className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Unavailable</h1>
                <p className="text-slate-500 max-w-md">{error || 'This project link is no longer active.'}</p>
                <button 
                    onClick={() => window.location.href = 'https://zentrixcrm.com'}
                    className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold"
                >
                    Back to Zentrix
                </button>
            </div>
        );
    }

    const { project, assets, tenant } = data;
    const safeTenant = tenant || { name: 'Real Estate', logo_url: '' };

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100">
            {/* Nav */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {safeTenant.logo_url ? (
                            <img src={safeTenant.logo_url} alt={safeTenant.name} className="h-10 w-auto" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl">Z</div>
                        )}
                        <span className="font-extrabold text-xl tracking-tight text-slate-900">{safeTenant.name}</span>
                    </div>
                    <a 
                        href="#enquire"
                        className="hidden md:flex px-6 py-2.5 rounded-full text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:scale-105 transition-transform"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Enquire Now
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                                <Star className="w-3 h-3 fill-current" />
                                Exclusive New Launch
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-tight mb-6">
                                {project.name}
                            </h1>
                            <div className="flex items-center gap-3 text-slate-500 mb-8">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                    <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                                </div>
                                <span className="font-semibold text-lg">{project.location}</span>
                            </div>
                            <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl">
                                {project.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                        <Home className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Type</div>
                                        <div className="font-bold text-slate-800">{project.property_type || 'Premium Residential'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                        <ShieldCheck className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Status</div>
                                        <div className="font-bold text-slate-800">RERA Registered</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-4 bg-indigo-500/10 rounded-[2.5rem] blur-2xl"></div>
                            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                                <img 
                                    src={project.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"} 
                                    className="w-full h-full object-cover" 
                                    alt={project.name} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                <div className="absolute bottom-8 left-8 right-8">
                                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex -space-x-3">
                                                    {[1,2,3].map(i => (
                                                        <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-white" />
                                                    ))}
                                                </div>
                                                <div className="text-white">
                                                    <div className="text-xs font-bold opacity-80 uppercase">Active Enquiries</div>
                                                    <div className="font-bold text-lg">124+ Investors</div>
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white animate-pulse">
                                                <Eye className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Amenities & Asset Vault */}
            <section className="py-20 bg-white px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2">
                            <h2 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4">
                                <span className="w-10 h-1 text-indigo-500 bg-indigo-500 rounded-full"></span>
                                World-Class Amenities
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-6">
                                {(project.amenities || "Luxury Pool, Clubhouse, 24/7 Security, Gymnasium, Landscaped Gardens, Kids Play Area").split(',').map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl transition-all hover:bg-indigo-50 group">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Star className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <span className="font-bold text-slate-800">{item.trim()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 mb-6">Asset Vault</h2>
                                <div className="space-y-4">
                                    {assets.length > 0 ? assets.map((asset, i) => (
                                        <div key={i} className="group relative p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between overflow-hidden">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                                    {asset.type.includes('Image') ? <Layout className="w-5 h-5 text-indigo-500" /> : <FileText className="w-5 h-5 text-orange-500" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{asset.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{asset.type}</div>
                                                </div>
                                            </div>
                                            <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ShieldCheck className="w-5 h-5" />
                                            </div>
                                            
                                            {/* Blur Overlay - Locked until enquiry */}
                                            {!submitted && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-not-allowed">
                                                    <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                                                        <ShieldCheck className="w-3 h-3" /> REGISTER TO UNLOCK
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {submitted && (
                                                <a 
                                                    href={asset.file_url} 
                                                    download 
                                                    className="absolute inset-0 flex items-center justify-center bg-indigo-600/10 opacity-0 hover:opacity-100 transition-opacity"
                                                >
                                                    <Download className="w-6 h-6 text-indigo-600" />
                                                </a>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                                            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-xs text-slate-400 font-medium">Digital assets coming soon</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-900 rounded-3xl text-white">
                                <Globe className="w-10 h-10 text-indigo-400 mb-4" />
                                <h3 className="font-bold text-xl mb-2">Instant Allocation</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                    Register now to get instantly assigned to a dedicated project expert for a personalized walkthrough.
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs font-bold text-green-400">Agents Online Now</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Enquiry Form */}
            <section id="enquire" className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-slate-100 overflow-hidden">
                        <div className="grid md:grid-cols-2">
                            <div className="p-10 lg:p-16 bg-slate-50 border-r border-slate-100">
                                <h2 className="text-3xl font-black text-slate-900 mb-6">Request More Information</h2>
                                <p className="text-slate-500 mb-10">
                                    Interested in pricing, floorplans, or a site visit? Fill in the details and our team will get back to you within 15 minutes.
                                </p>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                            <Phone className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400 font-bold uppercase">Call Support</div>
                                            <div className="font-bold text-slate-900">+91 (800) 123-4567</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                            <Mail className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400 font-bold uppercase">Email Enquiries</div>
                                            <div className="font-bold text-slate-900">sales@{safeTenant.name.toLowerCase().replace(/\s/g, '')}.com</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 lg:p-16">
                                {submitted ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                                            <CheckCircle className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Enquiry Received!</h3>
                                        <p className="text-slate-500">Thank you, {formData.name}. Our expert will contact you shortly.</p>
                                        <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">PRO TIP</p>
                                            <p className="text-sm text-indigo-900">Check your WhatsApp for the project brochure!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={formData.name}
                                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input 
                                                    type="tel" 
                                                    required
                                                    value={formData.phone}
                                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold"
                                                    placeholder="+91 00000 00000"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input 
                                                    type="email" 
                                                    value={formData.email}
                                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>
                                        <button 
                                            type="submit"
                                            className="w-full py-5 rounded-2xl text-white font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            Submit Enquiry
                                            <Send className="w-5 h-5" />
                                        </button>
                                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold pt-4">
                                            <ShieldCheck className="w-4 h-4" />
                                            YOUR DATA IS SECURE & ENCRYPTED
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-slate-200 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3 grayscale opacity-50">
                        <Globe className="w-5 h-5" />
                        <span className="font-bold text-slate-500">Secured by Zentrix CRM</span>
                    </div>
                    <div className="text-slate-400 text-sm font-medium">
                        © 2026 {safeTenant.name}. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><ShieldCheck className="w-6 h-6" /></a>
                        <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Mail className="w-6 h-6" /></a>
                    </div>
                </div>
            </footer>
            
            {/* AI CHAT CONCIERGE */}
            <ProjectChatbot projectId={projectId!} projectName={project.name} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                body { font-family: 'Plus Jakarta Sans', sans-serif; }
            `}</style>
        </div>
    );
};

export default ProjectMicrosite;
