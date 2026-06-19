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
  const isMobile = useMobile(768);
  const { setPageInfo } = usePageInfo();

  useEffect(() => {
    setPageInfo({
      title: `Good Morning, ${user?.name || 'MayaAdmin'}! 👋`,
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

  // ─── KPI Data ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const revenue = bookings.total_value ? formatRev(bookings.total_value) : '₹1.40 Cr';
    const bookingVal = bookings.total_value ? formatRev(Number(bookings.total_value) * 0.8) : '₹78.5 Cr';
    const bookingsCount = (bookings.total && bookings.total >= 10) ? bookings.total : 128;
    const activeLeadsCount = stats.leads?.total ? Number(stats.leads.total).toLocaleString() : '2,847';
    const conversionRateVal = stats.leads?.win_rate ? `${stats.leads.win_rate}%` : '4.52%';
    const collectionVal = stats.collection?.total ? formatRev(stats.collection.total) : '₹56.8 Cr';

    return [
      { label: 'Group Revenue', val: revenue, change: '18.6%', isUp: true, color: '#10b981', iconBg: '#ecfdf5', sparklineData: [1.1, 1.25, 1.15, 1.35, 1.28, 1.38, 1.32, 1.40], icon: <DollarSign size={16} color="#10b981" />, navigateTo: '/analytics' },
      { label: 'Booking Value', val: bookingVal, change: '12.4%', isUp: true, color: '#3b82f6', iconBg: '#eff6ff', sparklineData: [60, 65, 63, 72, 70, 75, 73, 78.5], icon: <Briefcase size={16} color="#3b82f6" />, navigateTo: '/bookings' },
      { label: 'Total Bookings', val: bookingsCount, change: '8.3%', isUp: true, color: '#f59e0b', iconBg: '#fffbeb', sparklineData: [100, 108, 105, 118, 114, 122, 120, 128], icon: <Calendar size={16} color="#f59e0b" />, navigateTo: '/bookings' },
      { label: 'Active Leads', val: activeLeadsCount, change: '15.2%', isUp: true, color: '#8b5cf6', iconBg: '#f5f3ff', sparklineData: [2200, 2400, 2350, 2600, 2550, 2750, 2700, 2847], icon: <Users size={16} color="#8b5cf6" />, navigateTo: '/leads' },
      { label: 'Conversion Rate', val: conversionRateVal, change: '0.68%', isUp: true, color: '#06b6d4', iconBg: '#ecfeff', sparklineData: [3.8, 4.1, 3.9, 4.3, 4.2, 4.4, 4.3, 4.52], icon: <Target size={16} color="#06b6d4" />, navigateTo: '/pipeline' },
      { label: 'Collection (MTD)', val: collectionVal, change: '-6.3%', isUp: false, color: '#ef4444', iconBg: '#fef2f2', sparklineData: [62, 60, 61, 58, 59, 57, 57.5, 56.8], icon: <TrendingUp size={16} color="#ef4444" style={{ transform: 'rotate(180deg)' }} />, navigateTo: '/payment-tracker' }
    ];
  }, [stats, bookings]);

  // ─── Revenue Source Data ───────────────────────────────────────
  const revenueSourceData = useMemo(() => [
    { name: 'Booking', value: 45, amount: '₹35.3 Cr', color: '#3b82f6' },
    { name: 'Collections', value: 30, amount: '₹23.6 Cr', color: '#06b6d4' },
    { name: 'Other Income', value: 15, amount: '₹11.8 Cr', color: '#8b5cf6' },
    { name: 'Adjustments', value: 10, amount: '₹7.8 Cr', color: '#f59e0b' }
  ], []);

  // ─── Funnel Data ───────────────────────────────────────────────
  const funnelData = useMemo(() => {
    switch (funnelPeriod) {
      case 'today':
        return [
          { label: 'Leads', count: 280, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 90, percentage: '32.1%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 48, percentage: '53.3%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 18, percentage: '37.5%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 4, percentage: '22.2%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
      case 'this_week':
        return [
          { label: 'Leads', count: 1940, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 640, percentage: '33.0%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 350, percentage: '54.7%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 120, percentage: '34.3%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 28, percentage: '23.3%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
      case 'last_month':
        return [
          { label: 'Leads', count: 9120, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 2980, percentage: '32.7%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 1650, percentage: '55.4%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 610, percentage: '37.0%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 135, percentage: '22.1%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
      case 'this_quarter':
        return [
          { label: 'Leads', count: 25800, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 8520, percentage: '33.0%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 4680, percentage: '54.9%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 1720, percentage: '36.8%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 390, percentage: '22.7%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
      case 'this_year':
        return [
          { label: 'Leads', count: 96420, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 31280, percentage: '32.4%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 16720, percentage: '53.5%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 5980, percentage: '35.8%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 1456, percentage: '24.3%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
      case 'this_month':
      default:
        return [
          { label: 'Leads', count: 8642, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
          { label: 'Qualified', count: 2847, percentage: '32.9%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
          { label: 'Site Visits', count: 1562, percentage: '55.0%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
          { label: 'Negotiation', count: 568, percentage: '36.4%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
          { label: 'Bookings', count: 128, percentage: '22.5%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
        ];
    }
  }, [funnelPeriod]);

  // ─── Revenue Trend Data ────────────────────────────────────────
  const revenueTrendData = useMemo(() => {
    switch (revenuePeriod) {
      case 'this_quarter':
        return [
          { name: 'Week 1', revenue: 8, target: 10 }, { name: 'Week 2', revenue: 12, target: 12 },
          { name: 'Week 3', revenue: 15, target: 13 }, { name: 'Week 4', revenue: 18, target: 15 },
          { name: 'Week 5', revenue: 22, target: 18 }, { name: 'Week 6', revenue: 26, target: 20 },
          { name: 'Week 7', revenue: 31, target: 22 }, { name: 'Week 8', revenue: 35, target: 25 }
        ];
      case 'this_month':
        return [
          { name: 'Day 1-5', revenue: 2, target: 3 }, { name: 'Day 6-10', revenue: 5, target: 5 },
          { name: 'Day 11-15', revenue: 9, target: 8 }, { name: 'Day 16-20', revenue: 14, target: 12 },
          { name: 'Day 21-25', revenue: 20, target: 16 }, { name: 'Day 26-30', revenue: 28, target: 20 }
        ];
      case 'this_year':
      default:
        return [
          { name: 'Jan', revenue: 12, target: 20 }, { name: 'Feb', revenue: 26, target: 28 },
          { name: 'Mar', revenue: 24, target: 36 }, { name: 'Apr', revenue: 38, target: 48 },
          { name: 'May', revenue: 78.5, target: 66 }, { name: 'Jun', revenue: 62, target: 72 },
          { name: 'Jul', revenue: 58, target: 82 }, { name: 'Aug', revenue: 75, target: 90 },
          { name: 'Sep', revenue: 90, target: 98 }, { name: 'Oct', revenue: 105, target: 108 },
          { name: 'Nov', revenue: 118, target: 118 }, { name: 'Dec', revenue: 130, target: 125 }
        ];
    }
  }, [revenuePeriod]);

  // ─── Top Projects Data ─────────────────────────────────────────
  const topProjectsData = useMemo(() => {
    switch (projectsPeriod) {
      case 'today':
        return [
          { name: 'Green Vista', bookings: '4 Bookings', value: '₹1.1 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '2 Bookings', value: '₹0.5 Cr', progress: 50, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '1 Bookings', value: '₹0.3 Cr', progress: 25, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_week':
        return [
          { name: 'Green Vista', bookings: '28 Bookings', value: '₹7.1 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '16 Bookings', value: '₹4.0 Cr', progress: 57, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '9 Bookings', value: '₹2.8 Cr', progress: 32, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'last_month':
        return [
          { name: 'Green Vista', bookings: '135 Bookings', value: '₹34.2 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '80 Bookings', value: '₹20.1 Cr', progress: 59, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '42 Bookings', value: '₹13.6 Cr', progress: 31, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_quarter':
        return [
          { name: 'Green Vista', bookings: '390 Bookings', value: '₹98.5 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '220 Bookings', value: '₹55.2 Cr', progress: 56, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '115 Bookings', value: '₹37.4 Cr', progress: 29, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_year':
        return [
          { name: 'Green Vista', bookings: '1,456 Bookings', value: '₹368.5 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '820 Bookings', value: '₹208.7 Cr', progress: 56, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '418 Bookings', value: '₹136.4 Cr', progress: 28, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_month':
      default:
        return [
          { name: 'Green Vista', bookings: '128 Bookings', value: '₹32.5 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
          { name: 'Sunrise Residency', bookings: '74 Bookings', value: '₹18.7 Cr', progress: 58, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
          { name: 'Maple Heights', bookings: '38 Bookings', value: '₹12.4 Cr', progress: 38, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' },
          { name: 'Skyline Towers', bookings: '18 Bookings', value: '₹8.2 Cr', progress: 25, color: '#f59e0b', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=100&auto=format&fit=crop&q=60' },
          { name: 'Riverfront Phase 2', bookings: '24 Bookings', value: '₹6.1 Cr', progress: 19, color: '#06b6d4', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&auto=format&fit=crop&q=60' }
        ];
    }
  }, [projectsPeriod]);

  // ─── Team Leaderboard Data ─────────────────────────────────────
  const teamData = useMemo(() => {
    switch (teamPeriod) {
      case 'today':
        return [
          { name: 'Rahul Sharma', leads: 5, visits: 2, bookings: 1, conversion: '20.0%', revenue: '₹0.25 Cr', sparklineData: [0.1, 0.15, 0.2, 0.25], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 4, visits: 1, bookings: 0, conversion: '0.0%', revenue: '₹0.00 Cr', sparklineData: [0, 0, 0, 0], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 4, visits: 1, bookings: 0, conversion: '0.0%', revenue: '₹0.00 Cr', sparklineData: [0, 0, 0, 0], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_week':
        return [
          { name: 'Rahul Sharma', leads: 32, visits: 10, bookings: 3, conversion: '9.4%', revenue: '₹0.80 Cr', sparklineData: [0.3, 0.5, 0.6, 0.8], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 28, visits: 9, bookings: 2, conversion: '7.1%', revenue: '₹0.50 Cr', sparklineData: [0.2, 0.3, 0.4, 0.5], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 30, visits: 8, bookings: 2, conversion: '6.7%', revenue: '₹0.48 Cr', sparklineData: [0.1, 0.2, 0.3, 0.48], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'last_month':
        return [
          { name: 'Rahul Sharma', leads: 162, visits: 52, bookings: 14, conversion: '8.6%', revenue: '₹3.80 Cr', sparklineData: [3.0, 3.2, 3.5, 3.8], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 148, visits: 45, bookings: 12, conversion: '8.1%', revenue: '₹3.10 Cr', sparklineData: [2.5, 2.8, 3.0, 3.1], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 140, visits: 40, bookings: 10, conversion: '7.1%', revenue: '₹2.45 Cr', sparklineData: [2.0, 2.2, 2.3, 2.45], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_quarter':
        return [
          { name: 'Rahul Sharma', leads: 480, visits: 150, bookings: 38, conversion: '7.9%', revenue: '₹9.80 Cr', sparklineData: [8.0, 8.5, 9.2, 9.8], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 430, visits: 130, bookings: 33, conversion: '7.7%', revenue: '₹8.40 Cr', sparklineData: [7.0, 7.5, 8.0, 8.4], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 410, visits: 120, bookings: 29, conversion: '7.1%', revenue: '₹7.20 Cr', sparklineData: [6.0, 6.5, 6.8, 7.2], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_year':
        return [
          { name: 'Rahul Sharma', leads: 1920, visits: 580, bookings: 148, conversion: '7.7%', revenue: '₹38.40 Cr', sparklineData: [32.0, 34.5, 36.8, 38.4], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 1720, visits: 520, bookings: 132, conversion: '7.7%', revenue: '₹34.10 Cr', sparklineData: [28.0, 30.5, 32.8, 34.1], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 1640, visits: 480, bookings: 110, conversion: '6.7%', revenue: '₹28.50 Cr', sparklineData: [24.0, 26.5, 27.8, 28.5], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' }
        ];
      case 'this_month':
      default:
        return [
          { name: 'Rahul Sharma', leads: 156, visits: 48, bookings: 12, conversion: '8.3%', revenue: '₹3.24 Cr', sparklineData: [2.5, 2.8, 3.0, 2.9, 3.1, 3.24], img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
          { name: 'Priya Singh', leads: 142, visits: 42, bookings: 11, conversion: '7.7%', revenue: '₹2.85 Cr', sparklineData: [2.0, 2.2, 2.5, 2.4, 2.7, 2.85], img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
          { name: 'Amit Verma', leads: 135, visits: 38, bookings: 9, conversion: '6.7%', revenue: '₹2.12 Cr', sparklineData: [1.8, 1.9, 2.0, 2.1, 2.1, 2.12], img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60' },
          { name: 'Neha Kapoor', leads: 118, visits: 33, bookings: 8, conversion: '6.8%', revenue: '₹1.85 Cr', sparklineData: [1.5, 1.6, 1.7, 1.7, 1.8, 1.85], img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60' },
          { name: 'Vikram Patel', leads: 105, visits: 28, bookings: 6, conversion: '5.7%', revenue: '₹1.35 Cr', sparklineData: [1.0, 1.1, 1.2, 1.1, 1.3, 1.35], img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60' }
        ];
    }
  }, [teamPeriod]);

  // ─── Static Data ───────────────────────────────────────────────
  const leadSourceData = [
    { name: 'Website', value: 42, count: 1195, color: '#3b82f6' },
    { name: 'Referral', value: 28, count: 796, color: '#06b6d4' },
    { name: 'Walk-in', value: 15, count: 427, color: '#f59e0b' },
    { name: 'Portal', value: 10, count: 284, color: '#8b5cf6' },
    { name: 'Social Media', value: 5, count: 142, color: '#ef4444' }
  ];

  const leadAgingData = [
    { name: '0-7 Days', value: 32, count: 911, color: '#3b82f6' },
    { name: '8-15 Days', value: 28, count: 797, color: '#06b6d4' },
    { name: '16-30 Days', value: 22, count: 626, color: '#f59e0b' },
    { name: '31-60 Days', value: 11, count: 313, color: '#8b5cf6' },
    { name: '60+ Days', value: 7, count: 200, color: '#ef4444' }
  ];

  const leadRiskData = [
    { name: 'High Risk', value: 12, percentage: '25.5%', color: '#ef4444' },
    { name: 'Medium Risk', value: 23, percentage: '48.9%', color: '#f59e0b' },
    { name: 'Low Risk', value: 12, percentage: '25.5%', color: '#10b981' }
  ];

  const activitiesData = [
    { user: 'Neha', action: 'completed site visit for', target: 'Amit Verma', time: '15m ago', initials: 'NK', color: '#3b82f6', bg: '#eff6ff' },
    { user: 'System Auto', action: 'assigned new lead to', target: 'Rahul', time: '28m ago', initials: 'SA', color: '#f59e0b', bg: '#fffbeb' },
    { user: 'Amit Verma', action: 'moved deal to', target: 'Negotiation', time: '45m ago', initials: 'AV', color: '#8b5cf6', bg: '#f5f3ff' },
    { user: 'Accounts', action: 'received payment of', target: '₹25,00,000', time: '1h ago', initials: 'AC', color: '#06b6d4', bg: '#ecfeff' },
    { user: 'Rohit Kumar', action: 'booked', target: 'Unit B120', time: '2h ago', initials: 'RK', color: '#10b981', bg: '#ecfdf5' }
  ];

  const bookingTrendData = [
    { name: 'Jan', bookings: 23 }, { name: 'Feb', bookings: 28 }, { name: 'Mar', bookings: 21 },
    { name: 'Apr', bookings: 32 }, { name: 'May', bookings: 26 }, { name: 'Jun', bookings: 16 },
    { name: 'Jul', bookings: 25 }, { name: 'Aug', bookings: 38 }, { name: 'Sep', bookings: 26 },
    { name: 'Oct', bookings: 30 }, { name: 'Nov', bookings: 21 }, { name: 'Dec', bookings: 24 }
  ];

  const inventoryChartData = [
    { name: 'Green Vista', sold: 180, available: 150, hold: 20 },
    { name: 'Sunrise Residency', sold: 140, available: 120, hold: 15 },
    { name: 'Maple Heights', sold: 110, available: 90, hold: 12 },
    { name: 'Skyline Towers', sold: 90, available: 110, hold: 10 },
    { name: 'Riverfront Phase 2', sold: 120, available: 130, hold: 8 },
    { name: 'Lakeview Apartments', sold: 100, available: 80, hold: 14 },
    { name: 'Orchard Estate', sold: 80, available: 95, hold: 6 }
  ];

  const tasksList = [
    { count: 3, label: 'Booking approvals pending' },
    { count: 5, label: 'KYC verifications pending' },
    { count: 7, label: 'Document uploads pending' },
    { count: 2, label: 'Payment follow-ups' }
  ];

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
      <TelemetryBanner />

      {/* Executive Summary with Critical Alerts */}
      <ExecutiveSummary isMobile={isMobile} />

      {/* Row 3: Revenue Command Center + Sidebar */}
      <div className="dash-row-grid">
        <RevenueCommandCenter
          isMobile={isMobile}
          revenuePeriod={revenuePeriod}
          onRevenuePeriodChange={setRevenuePeriod}
          revenueTrendData={revenueTrendData}
        />
        <RevenueSidebar
          isMobile={isMobile}
          revenueSourcePeriod={revenueSourcePeriod}
          onRevenueSourcePeriodChange={setRevenueSourcePeriod}
          revenueSourceData={revenueSourceData}
        />
      </div>

      {/* Row 4: Sales Funnel & Business Health */}
      <div className="dash-row-grid">
        <SalesFunnel
          funnelPeriod={funnelPeriod}
          onFunnelPeriodChange={setFunnelPeriod}
          funnelData={funnelData}
        />
        <BusinessHealthScore />
      </div>

      {/* Row 5: Top Projects & Booking Trend */}
      <div className="dash-row-grid">
        <TopProjects
          projectsPeriod={projectsPeriod}
          onProjectsPeriodChange={setProjectsPeriod}
          topProjectsData={topProjectsData}
        />
        <BookingTrend
          bookingPeriod={bookingPeriod}
          onBookingPeriodChange={setBookingPeriod}
          bookingTrendData={bookingTrendData}
        />
      </div>

      {/* Row 6: Team Performance & Live Activities */}
      <div className="dash-row-grid">
        <TeamPerformance
          teamPeriod={teamPeriod}
          onTeamPeriodChange={setTeamPeriod}
          teamData={teamData}
        />
        <LiveActivities activitiesData={activitiesData} />
      </div>

      {/* Row 7: Lead Source, Aging & Risk */}
      <LeadAnalyticsRow
        leadSourceData={leadSourceData}
        leadAgingData={leadAgingData}
        leadRiskData={leadRiskData}
      />

      {/* Row 8: Inventory Overview */}
      <InventoryOverview isMobile={isMobile} inventoryChartData={inventoryChartData} />

      {/* Row 9: Sales Target, AI Recommendation, Tasks */}
      <BottomRow tasksList={tasksList} />
    </div>
  );
}
