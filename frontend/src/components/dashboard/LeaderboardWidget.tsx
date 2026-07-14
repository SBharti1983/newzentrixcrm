import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, TrendingUp, User } from 'lucide-react';
import { dashboardApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';

interface LeaderboardEntry {
    agent_id: string;
    agent_name: string;
    agent_avatar: string | null;
    deals_closed: number;
    site_visits_done: number;
    revenue_generated: string;
    conversion_rate: string;
    rank: string;
}

const LeaderboardWidget: React.FC = () => {
    const { tenant } = useAuth();
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const response = await dashboardApi.getLeaderboard();
                setData(response.data || []);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy className="w-5 h-5 text-yellow-400" />;
            case 2: return <Medal className="w-5 h-5 text-slate-300" />;
            case 3: return <Medal className="w-5 h-5 text-amber-600" />;
            default: return <span className="text-sm font-bold text-slate-500">#{rank}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-full">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 mb-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="flex-1">
                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Top Performers</h3>
                </div>
                <div className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    This Week
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto">
                {data.length > 0 ? (
                    data.map((entry, index) => (
                        <div 
                            key={entry.agent_id} 
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${
                                index < 3 ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
                            }`}
                        >
                            <div className="w-8 flex justify-center">
                                {getRankIcon(parseInt(entry.rank))}
                            </div>

                            <div className="relative">
                                {entry.agent_avatar ? (
                                    <img 
                                        src={entry.agent_avatar} 
                                        alt={entry.agent_name} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800" 
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-800">
                                        <User className="w-5 h-5 text-slate-400" />
                                    </div>
                                )}
                                {index === 0 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                        <Star className="w-2 h-2 text-white fill-current" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">
                                    {entry.agent_name}
                                </h4>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] text-slate-500 uppercase font-medium tracking-wider">
                                        {entry.deals_closed} Deals
                                    </span>
                                    <span className="text-[10px] text-indigo-500 uppercase font-bold">
                                        {entry.conversion_rate}% Conv.
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                    ₹{new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(parseFloat(entry.revenue_generated))}
                                </div>
                                <div className="text-[10px] text-slate-400">Impact</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-10 opacity-50">
                        <Trophy className="w-12 h-12 mb-3 text-slate-300" />
                        <p className="text-sm text-slate-500">No performance data yet</p>
                    </div>
                )}
            </div>

            <button className="mt-6 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                View Full Rankings
            </button>
        </div>
    );
};

export default LeaderboardWidget;
