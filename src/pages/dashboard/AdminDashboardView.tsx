import React, { useMemo, useEffect, useState } from 'react';
import {
  TrendingUp, Users, Target, DollarSign,
  Briefcase, Calendar
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { usePageInfo } from '../../context/PageContext';
import { PeriodValue } from './components/shared/types';

// Sub-components
import DashboardSkeleton from './components/DashboardSkeleton';
import KPIGrid from './components/KPIGrid';
import TelemetryBanner from './components/TelemetryBanner';
import ExecutiveSummary from './components/ExecutiveSummary';
import RevenueCommandCenter from './components/RevenueCommandCenter';
import RevenueSidebar from './components/RevenueSidebar';
import SalesFunnel from './components/SalesFunnel';
import BusinessHealthScore from './components/BusinessHealthScore';
import TopProjects from './components/TopProjects';
import BookingTrend from './components/BookingTrend';
import TeamPerformance from './components/TeamPerformance';
import LiveActivities from './components/LiveActivities';
import LeadAnalyticsRow from './components/LeadAnalyticsRow';
import InventoryOverview from './components/InventoryOverview';
import BottomRow from './components/BottomRow';

interface AdminDashboardViewProps {
  user: any;
  data: any;
}

export default function AdminDashboardView({ user, data }: AdminDashboardViewProps) {
  const stats = data || {};
  const bookings = stats.bookings || {};
  const leads = stats.leads || {};
  const overdue = stats.overdue || {};
  const collection = stats.collection || {};
  const isMobile = useMobile(768);
  const { setPageInfo } = usePageInfo();

  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    setPageInfo({
      title: `${greeting}, ${user?.name || 'Admin'}! 👋`,
      subtitle: "Here's what's happening with your business today."
    });
    return () => setPageInfo({});
  }, [user, setPageInfo]);

  // Format currency helper
  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  // ─── Period States ─────────────────────────────────────────────
  const [funnelPeriod, setFunnelPeriod] = useState<PeriodValue>('this_month');
  const [projectsPeriod, setProjectsPeriod] = useState<PeriodValue>('this_month');
  const [teamPeriod, setTeamPeriod] = useState<PeriodValue>('this_month');
  const [revenuePeriod, setRevenuePeriod] = useState<PeriodValue>('this_year');
  const [revenueSourcePeriod, setRevenueSourcePeriod] = useState<PeriodValue>('this_year');
  const [bookingPeriod, setBookingPeriod] = useState<PeriodValue>('this_year');

  // ─── KPI Data (100% Real) ─────────────────────────────────────
  const kpis = useMemo(() => {
    const totalValue = Number(bookings.total_value || 0);
    const totalCount = Number(bookings.total || 0);
    const activeLeads = Number(leads.active_leads || 0);
    const winRate = Number(leads.win_rate || 0);
    const overdueAmt = Number(overdue.overdue_amount || 0);
    const collectionTotal = Number(collection.total || 0);

    const trendsList = stats.trends || [];
    const bookingTrendsList = stats.booking_trends || [];

    const revenueSpark = bookingTrendsList.map((t: any) => Number(t.bookings || 0));
    const leadsSpark = trendsList.map((t: any) => Number(t.leads || 0));
    const conversionSpark = trendsList.map((t: any) => Number(t.calls || 0));
    const overdueSpark = trendsList.map((t: any) => Number(t.follow || 0));

    // Compute booking value (total_value represents the total booking value)
    const revenue = formatRev(totalValue);
    const bookingVal = formatRev(totalValue);

    return [
      {
        label: 'Group Revenue',
        val: revenue,
        change: winRate > 0 ? `${winRate}%` : '–',
        isUp: totalValue > 0,
        color: '#10b981',
        iconBg: '#ecfdf5',
        sparklineData: revenueSpark,
        icon: <DollarSign size={16} color="#10b981" />,
        navigateTo: '/analytics'
      },
      {
        label: 'Booking Value',
        val: bookingVal,
        change: '–',
        isUp: totalValue > 0,
        color: '#3b82f6',
        iconBg: '#eff6ff',
        sparklineData: revenueSpark,
        icon: <Briefcase size={16} color="#3b82f6" />,
        navigateTo: '/bookings'
      },
      {
        label: 'Total Bookings',
        val: totalCount,
        change: '–',
        isUp: totalCount > 0,
        color: '#f59e0b',
        iconBg: '#fffbeb',
        sparklineData: revenueSpark,
        icon: <Calendar size={16} color="#f59e0b" />,
        navigateTo: '/bookings'
      },
      {
        label: 'Active Leads',
        val: activeLeads.toLocaleString(),
        change: '–',
        isUp: activeLeads > 0,
        color: '#8b5cf6',
        iconBg: '#f5f3ff',
        sparklineData: leadsSpark,
        icon: <Users size={16} color="#8b5cf6" />,
        navigateTo: '/leads'
      },
      {
        label: 'Conversion Rate',
        val: winRate > 0 ? `${winRate}%` : '0%',
        change: '–',
        isUp: winRate > 0,
        color: '#06b6d4',
        iconBg: '#ecfeff',
        sparklineData: conversionSpark,
        icon: <Target size={16} color="#06b6d4" />,
        navigateTo: '/pipeline'
      },
      {
        label: 'Overdue Amount',
        val: overdueAmt > 0 ? formatRev(overdueAmt) : collectionTotal > 0 ? formatRev(collectionTotal) : '₹0',
        change: overdueAmt > 0 ? `${overdue.overdue_count || 0} overdue` : '–',
        isUp: false,
        color: overdueAmt > 0 ? '#ef4444' : '#10b981',
        iconBg: overdueAmt > 0 ? '#fef2f2' : '#ecfdf5',
        sparklineData: overdueSpark,
        icon: <TrendingUp size={16} color={overdueAmt > 0 ? '#ef4444' : '#10b981'} style={overdueAmt > 0 ? { transform: 'rotate(180deg)' } : undefined} />,
        navigateTo: '/payment-tracker'
      }
    ];
  }, [stats, bookings, leads, overdue, collection]);

  // ─── Render ────────────────────────────────────────────────────
  if (!data) return <DashboardSkeleton />;

  return (
    <div className="dash-premium-container" style={{ padding: isMobile ? '16px' : '24px 32px', margin: isMobile ? undefined : '-16px -28px -28px -28px' }}>
      <style>{`
        .dash-premium-container { background: #f8fafc; min-height: 100vh; }
        .dash-grid-6-kpi { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 24px; }
        .enterprise-kpi-card { background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 18px rgba(148, 163, 184, 0.03); padding: 16px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; min-height: 155px; height: auto; }
        .enterprise-kpi-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.08), 0 4px 12px rgba(148, 163, 184, 0.06); border-color: #a5b4fc; }
        .dash-card { background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 18px rgba(148, 163, 184, 0.03); padding: 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99, 102, 241, 0.07), 0 4px 10px rgba(148, 163, 184, 0.05); border-color: #c7d2fe; }
        .dash-row-grid { display: grid; grid-template-columns: repeat(24, 1fr); gap: 24px; margin-bottom: 24px; }
        .dash-period-select-wrapper { display: flex; align-items: center; gap: 4px; position: relative; padding: 4px 28px 4px 10px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; color: #64748b; font-size: 0.75rem; font-weight: 700; transition: all 0.2s ease; cursor: pointer; }
        .dash-period-select-wrapper:hover { background: #e2e8f0; border-color: #cbd5e1; }
        .dash-period-select-wrapper:focus-within { border-color: #818cf8; box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2); }
        .dash-period-select { background: transparent; border: none; color: #475569; font-size: 0.75rem; font-weight: 700; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; margin: 0; padding: 0; }
        .dash-period-select:focus-visible { outline: none; }
        @keyframes dashFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .dash-data-fade { animation: dashFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .leaderboard-row { transition: background-color 0.2s ease; }
        .leaderboard-row:hover { background-color: #f8fafc !important; cursor: pointer; }
        .task-item-card { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .task-item-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(148, 163, 184, 0.08); border-color: #e2e8f0; }
        .col-span-7 { grid-column: span 7; } .col-span-8 { grid-column: span 8; } .col-span-10 { grid-column: span 10; }
        .col-span-12 { grid-column: span 12; } .col-span-14 { grid-column: span 14; } .col-span-17 { grid-column: span 17; }
        .col-span-24 { grid-column: span 24; }
        @media (max-width: 1200px) { .dash-row-grid { grid-template-columns: 1fr; } .col-span-7,.col-span-8,.col-span-10,.col-span-12,.col-span-14,.col-span-17,.col-span-24 { grid-column: span 1; } .dash-grid-6-kpi { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 768px) { .dash-grid-6-kpi { grid-template-columns: 1fr 1fr; gap: 12px; } }
        .dash-scrollbar::-webkit-scrollbar { width: 4px; } .dash-scrollbar::-webkit-scrollbar-track { background: transparent; } .dash-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* Row 1: KPI Cards */}
      <KPIGrid kpis={kpis} />

      {/* Row 2: Telemetry Banner */}
      <TelemetryBanner data={stats} />

      {/* Executive Summary with Critical Alerts */}
      <ExecutiveSummary data={stats} isMobile={isMobile} />

      {/* Row 3: Revenue Command Center + Sidebar */}
      <div className="dash-row-grid">
        <RevenueCommandCenter
          data={stats}
          isMobile={isMobile}
          revenuePeriod={revenuePeriod}
          onRevenuePeriodChange={setRevenuePeriod}
        />
        <RevenueSidebar
          data={stats}
          isMobile={isMobile}
          revenueSourcePeriod={revenueSourcePeriod}
          onRevenueSourcePeriodChange={setRevenueSourcePeriod}
        />
      </div>

      {/* Row 4: Sales Funnel & Business Health */}
      <div className="dash-row-grid">
        <SalesFunnel
          data={stats}
          funnelPeriod={funnelPeriod}
          onFunnelPeriodChange={setFunnelPeriod}
        />
        <BusinessHealthScore data={stats} />
      </div>

      {/* Row 5: Top Projects & Booking Trend */}
      <div className="dash-row-grid">
        <TopProjects
          data={stats}
          projectsPeriod={projectsPeriod}
          onProjectsPeriodChange={setProjectsPeriod}
        />
        <BookingTrend
          data={stats}
          bookingPeriod={bookingPeriod}
          onBookingPeriodChange={setBookingPeriod}
        />
      </div>

      {/* Row 6: Team Performance & Live Activities */}
      <div className="dash-row-grid">
        <TeamPerformance
          data={stats}
          teamPeriod={teamPeriod}
          onTeamPeriodChange={setTeamPeriod}
        />
        <LiveActivities data={stats} />
      </div>

      {/* Row 7: Lead Source, Aging & Risk */}
      <LeadAnalyticsRow data={stats} />

      {/* Row 8: Inventory Overview */}
      <InventoryOverview data={stats} isMobile={isMobile} />

      {/* Row 9: Sales Target, AI Recommendation, Tasks */}
      <BottomRow data={stats} />
    </div>
  );
}
