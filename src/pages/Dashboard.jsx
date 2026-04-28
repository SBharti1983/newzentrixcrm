import React, { useMemo, useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { PageLoader, PageError } from '../components/Feedback';
import { dashboardApi, leadsApi, telephonyApi } from '../api/client';
import { Navigate } from 'react-router-dom';
import AgentDashboardView from './AgentDashboardView';
import ManagerDashboardView from './ManagerDashboardView';
import AdminDashboardView from './AdminDashboardView';
import TeamLeaderDashboardView from './TeamLeaderDashboardView';
import SoloDashboard from './SoloDashboard';
import {
    AlertCircle, TrendingUp,
    Clock, Flame,
    ShieldCheck,
    Trophy,
} from 'lucide-react';


const STAGE_COLORS = { 
    'New Lead': '#3b82f6', 'Connected': '#6366f1', 'Qualified': '#06b6d4',
    'Site Visit Scheduled': '#14b8a6', 'Site Visit Done': '#10b981',
    'Interested': '#8b5cf6', 'Proposal Shared': '#d946ef',
    'Negotiation': '#f59e0b', 'Won': '#10b981', 'Lost': '#f43f5e',
};

export default function Dashboard() {
    const { user } = useAuth();
    const isManager = ['superadmin', 'admin', 'sales_manager'].includes(user?.role);
    
    // View state
    const [personalMode, setPersonalMode] = useState(user?.role === 'agent');
    const [selectedMemberId] = useState(null);
    
    // API Call with dynamic params
    const { data, loading, error, refetch } = useApi(
        () => dashboardApi.get({ 
            personal: personalMode,
            member_id: selectedMemberId 
        }),
        [personalMode, selectedMemberId]
    );

    const { data: recentLeads } = useApi(
        () => leadsApi.list({ limit: 5, ...(personalMode ? { assigned_to: user?.id } : {}) }),
        [personalMode, user?.id]
    );

    const { data: telemetryData } = useApi(
        () => isManager ? telephonyApi.getAnalytics() : Promise.resolve(null),
        [isManager]
    );

    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const pipeline = stats.pipeline || {};
    const stages = stats.stages || [];
    const upcomingFollowups = stats.upcoming_followups || [];
    const overdue = stats.overdue || {};

    const formatRevenue = (val) => {
        if (!val) return '₹0';
        const cr = val / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(val / 100000).toFixed(1)} L`;
    };

    // Role-Aware Smart Briefing
    const smartInsights = useMemo(() => {
        const stageArray = Array.isArray(stages) ? stages : [];
        const stageCounts = stageArray.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {});
        const hotCount = stageCounts['Negotiation'] || 0;
        const svCount = stageCounts['Site Visit Done'] || 0;
        const overdueCount = (overdue && overdue.overdue_count) ? overdue.overdue_count : 0;

        if (personalMode) {
            return [
                {
                    icon: Trophy,
                    color: '#f59e0b',
                    bg: 'rgba(245,158,11,0.1)',
                    title: 'Rank Factor',
                    desc: `You are in top 15% of agents this week. 1 more 'Won' deal puts you in Top 3.`,
                },
                {
                    icon: Flame,
                    color: '#f43f5e',
                    bg: 'rgba(244,63,94,0.1)',
                    title: 'Hot Pipeline',
                    desc: hotCount > 0 
                        ? `You have ${hotCount} leads in Negotiation. Close them to hit 110% of your quota.`
                        : 'No leads in negotiation. Push site-visit leads forward today.',
                },
                {
                    icon: Clock,
                    color: '#3b82f6',
                    bg: 'rgba(59,130,246,0.1)',
                    title: 'Today Focus',
                    desc: upcomingFollowups.length > 0
                        ? `You have ${upcomingFollowups.length} follow-ups. Start with '${upcomingFollowups[0].lead_name}' — high priority.`
                        : 'Your agenda is clear for today. Focus on lead prospecting.',
                }
            ];
        }

        return [
            {
                icon: ShieldCheck,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.1)',
                title: 'Team Health',
                desc: `Site visit conversion is up 8% team-wide. High performance noted in Project Elite.`,
            },
            {
                icon: AlertCircle,
                color: '#f43f5e',
                bg: 'rgba(244,63,94,0.1)',
                title: 'Bottleneck Alert',
                desc: `${stageCounts['New Lead'] || 0} New Leads are unassigned. Move them to agents within 2 hours to maintain ROI.`,
            },
            {
                icon: TrendingUp,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.1)',
                title: 'Revenue Forecast',
                desc: `Projected pipeline value: ${formatRevenue((Number(pipeline?.value) || 0) * 0.15)} likely to convert this month.`,
            },
        ];
    }, [stages, overdue, personalMode, upcomingFollowups, formatRevenue, pipeline]);

    // Sync personalMode if user role changes or initial load
    useEffect(() => {
        if (user?.role === 'agent') setPersonalMode(true);
    }, [user?.role]);

    if (loading) return <PageLoader />;
    if (error) return <PageError message={error} onRetry={refetch} />;

    if (user?.role === 'superadmin') {
        return <Navigate to="/superadmin" replace />;
    }
    let dashboardView;
    if (user?.tenant_plan === 'pro_solo' || user?.tenant?.plan === 'pro_solo') {
        dashboardView = <SoloDashboard />;
    } else if (user?.role === 'admin') {
        dashboardView = <AdminDashboardView user={user} data={stats} />;
    } else if (user?.role === 'team_leader') {
        dashboardView = <TeamLeaderDashboardView user={user} data={stats} />;
    } else if (personalMode) {
        dashboardView = (
            <div className="animate-fadeIn" style={{ background: '#f8fafc', padding: '24px', minHeight: '100vh', margin: '-24px' }}>
                <AgentDashboardView 
                    user={user} 
                    data={stats} 
                    recentLeads={recentLeads?.data || []} 
                    loading={loading}
                />
            </div>
        );
    } else {
        dashboardView = (
            <div className="animate-fadeIn" style={{ background: '#f4f7fb', margin: '-24px' }}>
                <ManagerDashboardView user={user} data={stats} telemetry={telemetryData} loading={loading} />
            </div>
        );
    }

    return (
        <>
            {dashboardView}
        </>
    );
}
