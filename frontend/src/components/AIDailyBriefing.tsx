import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Phone, Brain, ChevronRight, Loader2, Target, MessageSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AIDailyBriefing: React.FC = () => {
    const [briefing, setBriefing] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBriefing();
    }, []);

    const fetchBriefing = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/ai/daily-briefing');
            setBriefing(res.data || []);
            setError(false);
        } catch (err) {
            console.error('Briefing failed:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-indigo-100 shadow-xl shadow-indigo-50/50 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute -top-2 -right-2 animate-bounce" />
                </div>
                <p className="text-gray-500 font-bold tracking-tight">AI is analyzing your portfolio...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 flex items-center space-x-4">
                <AlertCircle className="text-rose-500" />
                <p className="text-rose-700 font-medium">Daily Briefing currently unavailable.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                        <Brain className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight leading-none">AI Daily Briefing</h2>
                        <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold mt-1">Strategic Call List</p>
                    </div>
                </div>
                <div className="bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                    <span className="text-[11px] font-black text-indigo-200">5 PRIORITY LEADS</span>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {briefing.map((item, idx) => (
                    <div 
                        key={item.id}
                        onClick={() => navigate(`/leads/${item.id}`)}
                        className="group relative bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/50 border border-transparent hover:border-indigo-100 p-4 rounded-2xl transition-all duration-300 cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-lg font-black text-slate-800 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-colors">
                                    {item.leadName[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{item.leadName}</h3>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${item.score}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{item.score}% Intent</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Phone className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mt-3 bg-white/50 border border-slate-100 rounded-xl p-3 group-hover:bg-white transition-all">
                            <div className="flex items-start space-x-2">
                                <Target className="w-3 h-3 text-rose-500 mt-1 flex-shrink-0" />
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    <span className="font-extrabold text-slate-800">WHY:</span> {item.reason}
                                </p>
                            </div>
                            <div className="mt-2 flex items-start space-x-2">
                                <MessageSquare className="w-3 h-3 text-indigo-500 mt-1 flex-shrink-0" />
                                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                                    <span className="font-extrabold text-slate-800 not-italic">TALKING POINT:</span> "{item.talkingPoint}"
                                </p>
                            </div>
                        </div>

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>
                ))}

                {briefing.length === 0 && (
                    <div className="py-12 text-center">
                        <p className="text-gray-400 font-medium italic">No strategic updates for your portfolio right now.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                <button 
                    onClick={fetchBriefing}
                    className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>REFRESH INTELLIGENCE</span>
                </button>
            </div>
        </div>
    );
};

export default AIDailyBriefing;
