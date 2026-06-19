import React, { useMemo, useEffect, useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Cell,
  PieChart, Pie, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, 
  ShieldCheck, Clock, AlertCircle, ArrowUpRight, AlertTriangle, Briefcase, 
  CheckSquare, ArrowRight, MoreHorizontal, Calendar, ArrowUp, ArrowDown, Percent,
  ChevronRight, FileText, CheckCircle2
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { usePageInfo } from '../../context/PageContext';

// Sub-component: Area sparkline for KPI cards
const Sparkline = React.memo(({ data, color }: { data: number[]; color: string }) => {
  const chartData = data.map((val, idx) => ({ id: idx, val }));
  return (
    <div style={{ width: '70px', height: '24px', flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`glow-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#glow-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Sub-component: Sales Funnel clip-path layer
const FunnelSegment = React.memo(({ label, count, percentage, color, clipPath, width }: {
  label: string;
  count: number;
  percentage?: string;
  color: string;
  clipPath: string;
  width: string;
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '36px', margin: '4px 0' }}>
      <div style={{ width: '45%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{
          width: width,
          height: '100%',
          background: color,
          clipPath: clipPath,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }} />
      </div>
      <div style={{ width: '25%', paddingLeft: '12px', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
        {label}
      </div>
      <div style={{ width: '30%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
          {Number(count).toLocaleString()}
        </span>
        {percentage ? (
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
            {percentage}
          </span>
        ) : (
          <span style={{ minWidth: '40px' }} />
        )}
      </div>
    </div>
  );
});

// Sub-component: Custom tooltip for Revenue Trend AreaChart
const CustomRevenueTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        fontSize: '0.78rem',
        fontWeight: 700,
        lineHeight: 1.5
      }}>
        <div style={{ color: '#0f172a', fontWeight: 800, marginBottom: '4px' }}>
          {data.name} 2024
        </div>
        <div style={{ color: '#475569' }}>
          Revenue: <span style={{ color: '#0f172a', fontWeight: 800 }}>₹{data.revenue.toFixed(1)} Cr</span>
        </div>
        <div style={{ color: '#475569' }}>
          Target: <span style={{ color: '#0f172a', fontWeight: 800 }}>₹{data.target.toFixed(1)} Cr</span>
        </div>
        <div style={{ color: '#475569' }}>
          Achievement: <span style={{ color: '#0f172a', fontWeight: 800 }}>{Math.floor(data.revenue * 100 / data.target)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

// Sub-component: Custom tooltip for Pie charts (Lead Source & Lead Aging)
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
        fontSize: '0.78rem',
        fontWeight: 700
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: data.color }} />
          <span style={{ color: '#64748b' }}>{data.name}:</span>
          <span style={{ color: '#0f172a', fontWeight: 850 }}>{data.value}%</span>
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>({data.count})</span>
        </div>
      </div>
    );
  }
  return null;
};

// Sub-component: Custom tooltip for Inventory stacked Bar chart
const CustomInventoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        fontSize: '0.78rem',
        fontWeight: 700
      }}>
        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.82rem', marginBottom: '8px' }}>
          {label}
        </div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: idx === payload.length - 1 ? '0' : '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: p.fill }} />
            <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{p.name}:</span>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>{p.value} Units</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};


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

  // KPI metadata with fallbacks matching user mockup
  const kpis = useMemo(() => {
    const revenue = bookings.total_value ? formatRev(bookings.total_value) : '₹1.40 Cr';
    const bookingVal = bookings.total_value ? formatRev(Number(bookings.total_value) * 0.8) : '₹78.5 Cr';
    const bookingsCount = (bookings.total && bookings.total >= 10) ? bookings.total : 128;
    const activeLeadsCount = stats.leads?.total ? Number(stats.leads.total).toLocaleString() : '2,847';
    const conversionRateVal = stats.leads?.win_rate ? `${stats.leads.win_rate}%` : '4.52%';
    const collectionVal = stats.collection?.total ? formatRev(stats.collection.total) : '₹56.8 Cr';

    return [
      {
        label: 'Group Revenue',
        val: revenue,
        change: '18.6%',
        isUp: true,
        color: '#10b981',
        iconBg: '#ecfdf5',
        sparklineData: [1.1, 1.25, 1.15, 1.35, 1.28, 1.38, 1.32, 1.40],
        icon: <DollarSign size={16} color="#10b981" />
      },
      {
        label: 'Booking Value',
        val: bookingVal,
        change: '12.4%',
        isUp: true,
        color: '#3b82f6',
        iconBg: '#eff6ff',
        sparklineData: [60, 65, 63, 72, 70, 75, 73, 78.5],
        icon: <Briefcase size={16} color="#3b82f6" />
      },
      {
        label: 'Total Bookings',
        val: bookingsCount,
        change: '8.3%',
        isUp: true,
        color: '#f59e0b',
        iconBg: '#fffbeb',
        sparklineData: [100, 108, 105, 118, 114, 122, 120, 128],
        icon: <Calendar size={16} color="#f59e0b" />
      },
      {
        label: 'Active Leads',
        val: activeLeadsCount,
        change: '15.2%',
        isUp: true,
        color: '#8b5cf6',
        iconBg: '#f5f3ff',
        sparklineData: [2200, 2400, 2350, 2600, 2550, 2750, 2700, 2847],
        icon: <Users size={16} color="#8b5cf6" />
      },
      {
        label: 'Conversion Rate',
        val: conversionRateVal,
        change: '0.68%',
        isUp: true,
        color: '#06b6d4',
        iconBg: '#ecfeff',
        sparklineData: [3.8, 4.1, 3.9, 4.3, 4.2, 4.4, 4.3, 4.52],
        icon: <Target size={16} color="#06b6d4" />
      },
      {
        label: 'Collection (MTD)',
        val: collectionVal,
        change: '-6.3%',
        isUp: false,
        color: '#ef4444',
        iconBg: '#fef2f2',
        sparklineData: [62, 60, 61, 58, 59, 57, 57.5, 56.8],
        icon: <TrendingUp size={16} color="#ef4444" style={{ transform: 'rotate(180deg)' }} />
      }
    ];
  }, [stats, bookings]);

  // States for period dropdowns
  const [funnelPeriod, setFunnelPeriod] = useState('this_month');
  const [projectsPeriod, setProjectsPeriod] = useState('this_month');
  const [teamPeriod, setTeamPeriod] = useState('this_month');
  const [revenuePeriod, setRevenuePeriod] = useState('this_year');
  const [targetPeriod, setTargetPeriod] = useState('this_year');
  const [revenueSourcePeriod, setRevenueSourcePeriod] = useState('this_year');
  const [bookingPeriod, setBookingPeriod] = useState('this_year');
  const [leadRiskPeriod, setLeadRiskPeriod] = useState('all_leads');

  const forecastSparklineData = useMemo(() => [
    { val: 12.4 }, { val: 13.5 }, { val: 14.2 }, { val: 15.6 }, { val: 16.3 }, { val: 17.1 }, { val: 18.2 }
  ], []);

  const revenueSourceData = useMemo(() => [
    { name: 'Booking', value: 45, amount: '₹35.3 Cr', color: '#3b82f6' },
    { name: 'Collections', value: 30, amount: '₹23.6 Cr', color: '#06b6d4' },
    { name: 'Other Income', value: 15, amount: '₹11.8 Cr', color: '#8b5cf6' },
    { name: 'Adjustments', value: 10, amount: '₹7.8 Cr', color: '#f59e0b' }
  ], []);

  // Funnel segments
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

  // Revenue trend vs target over 12 months
  const revenueTrendData = useMemo(() => {
    switch (revenuePeriod) {
      case 'this_quarter':
        return [
          { name: 'Week 1', revenue: 8, target: 10 },
          { name: 'Week 2', revenue: 12, target: 12 },
          { name: 'Week 3', revenue: 15, target: 13 },
          { name: 'Week 4', revenue: 18, target: 15 },
          { name: 'Week 5', revenue: 22, target: 18 },
          { name: 'Week 6', revenue: 26, target: 20 },
          { name: 'Week 7', revenue: 31, target: 22 },
          { name: 'Week 8', revenue: 35, target: 25 }
        ];
      case 'this_month':
        return [
          { name: 'Day 1-5', revenue: 2, target: 3 },
          { name: 'Day 6-10', revenue: 5, target: 5 },
          { name: 'Day 11-15', revenue: 9, target: 8 },
          { name: 'Day 16-20', revenue: 14, target: 12 },
          { name: 'Day 21-25', revenue: 20, target: 16 },
          { name: 'Day 26-30', revenue: 28, target: 20 }
        ];
      case 'this_year':
      default:
        return [
          { name: 'Jan', revenue: 12, target: 20 },
          { name: 'Feb', revenue: 26, target: 28 },
          { name: 'Mar', revenue: 24, target: 36 },
          { name: 'Apr', revenue: 38, target: 48 },
          { name: 'May', revenue: 78.5, target: 66 },
          { name: 'Jun', revenue: 62, target: 72 },
          { name: 'Jul', revenue: 58, target: 82 },
          { name: 'Aug', revenue: 75, target: 90 },
          { name: 'Sep', revenue: 90, target: 98 },
          { name: 'Oct', revenue: 105, target: 108 },
          { name: 'Nov', revenue: 118, target: 118 },
          { name: 'Dec', revenue: 130, target: 125 }
        ];
    }
  }, [revenuePeriod]);

  // Top Performing Projects
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

  // Team Leaderboard
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

  // Donut data for Lead Source
  const leadSourceData = [
    { name: 'Website', value: 42, count: 1195, color: '#3b82f6' },
    { name: 'Referral', value: 28, count: 796, color: '#06b6d4' },
    { name: 'Walk-in', value: 15, count: 427, color: '#f59e0b' },
    { name: 'Portal', value: 10, count: 284, color: '#8b5cf6' },
    { name: 'Social Media', value: 5, count: 142, color: '#ef4444' }
  ];

  // Donut data for Lead Aging
  const leadAgingData = [
    { name: '0-7 Days', value: 32, count: 911, color: '#3b82f6' },
    { name: '8-15 Days', value: 28, count: 797, color: '#06b6d4' },
    { name: '16-30 Days', value: 22, count: 626, color: '#f59e0b' },
    { name: '31-60 Days', value: 11, count: 313, color: '#8b5cf6' },
    { name: '60+ Days', value: 7, count: 200, color: '#ef4444' }
  ];

  // Timeline feed
  const activitiesData = [
    { user: 'Neha', action: 'completed site visit for', target: 'Amit Verma', time: '15m ago', initials: 'NK', color: '#3b82f6', bg: '#eff6ff' },
    { user: 'System Auto', action: 'assigned new lead to', target: 'Rahul', time: '28m ago', initials: 'SA', color: '#f59e0b', bg: '#fffbeb' },
    { user: 'Amit Verma', action: 'moved deal to', target: 'Negotiation', time: '45m ago', initials: 'AV', color: '#8b5cf6', bg: '#f5f3ff' },
    { user: 'Accounts', action: 'received payment of', target: '₹25,00,000', time: '1h ago', initials: 'AC', color: '#06b6d4', bg: '#ecfeff' },
    { user: 'Rohit Kumar', action: 'booked', target: 'Unit B120', time: '2h ago', initials: 'RK', color: '#10b981', bg: '#ecfdf5' }
  ];

  // Custom static data for Lead Risk and Booking Trend
  const leadRiskData = [
    { name: 'High Risk', value: 12, percentage: '25.5%', color: '#ef4444' },
    { name: 'Medium Risk', value: 23, percentage: '48.9%', color: '#f59e0b' },
    { name: 'Low Risk', value: 12, percentage: '25.5%', color: '#10b981' }
  ];

  const bookingTrendData = [
    { name: 'Jan', bookings: 23 },
    { name: 'Feb', bookings: 28 },
    { name: 'Mar', bookings: 21 },
    { name: 'Apr', bookings: 32 },
    { name: 'May', bookings: 26 },
    { name: 'Jun', bookings: 16 },
    { name: 'Jul', bookings: 25 },
    { name: 'Aug', bookings: 38 },
    { name: 'Sep', bookings: 26 },
    { name: 'Oct', bookings: 30 },
    { name: 'Nov', bookings: 21 },
    { name: 'Dec', bookings: 24 }
  ];

  // Grouped Stacked Bar chart for projects inventory
  const inventoryChartData = [
    { name: 'Green Vista', sold: 180, available: 150, hold: 20 },
    { name: 'Sunrise Residency', sold: 140, available: 120, hold: 15 },
    { name: 'Maple Heights', sold: 110, available: 90, hold: 12 },
    { name: 'Skyline Towers', sold: 90, available: 110, hold: 10 },
    { name: 'Riverfront Phase 2', sold: 120, available: 130, hold: 8 },
    { name: 'Lakeview Apartments', sold: 100, available: 80, hold: 14 },
    { name: 'Orchard Estate', sold: 80, available: 95, hold: 6 }
  ];

  // Sales target calculation based on period
  const targetDataCalculated = useMemo(() => {
    switch (targetPeriod) {
      case 'today':
        return { achieved: 0.85, target: 1.0, remaining: 0.15, percentage: 85 };
      case 'this_week':
        return { achieved: 6.2, target: 8.0, remaining: 1.8, percentage: 77 };
      case 'this_month':
        return { achieved: 28.5, target: 35.0, remaining: 6.5, percentage: 81 };
      case 'this_year':
      default:
        return { achieved: 140.4, target: 180.0, remaining: 39.6, percentage: 78 };
    }
  }, [targetPeriod]);

  // Radial target gauge achieved segments
  const radialTargetData = useMemo(() => {
    return [
      { name: 'Achieved', value: targetDataCalculated.percentage, color: '#10b981' },
      { name: 'Remaining', value: 100 - targetDataCalculated.percentage, color: '#f1f5f9' }
    ];
  }, [targetDataCalculated]);

  // Tasks checklist
  const tasksList = [
    { count: 3, label: 'Booking approvals pending' },
    { count: 5, label: 'KYC verifications pending' },
    { count: 7, label: 'Document uploads pending' },
    { count: 2, label: 'Payment follow-ups' }
  ];

  return (
    <div className="dash-premium-container" style={{ padding: isMobile ? '16px' : '24px 32px', margin: isMobile ? undefined : '-16px -28px -28px -28px' }}>
      <style>{`
        /* Local overrides and layouts */
        .dash-premium-container {
          background: #f8fafc;
          min-height: 100vh;
        }
        .dash-grid-6-kpi {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .enterprise-kpi-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 18px rgba(148, 163, 184, 0.03);
          padding: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 155px;
          height: auto;
        }
        .enterprise-kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.08), 0 4px 12px rgba(148, 163, 184, 0.06);
          border-color: #a5b4fc;
        }
        .dash-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 18px rgba(148, 163, 184, 0.03);
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .dash-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.07), 0 4px 10px rgba(148, 163, 184, 0.05);
          border-color: #c7d2fe;
        }
        .dash-row-grid {
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }
        /* Period dropdown pill styling */
        .dash-period-select-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
          padding: 4px 28px 4px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .dash-period-select-wrapper:hover {
          background: #e2e8f0;
          border-color: #cbd5e1;
        }
        .dash-period-select-wrapper:focus-within {
          border-color: #818cf8;
          box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2);
        }
        .dash-period-select {
          background: transparent;
          border: none;
          color: #475569;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          outline: none;
          appearance: none;
          -webkit-appearance: none;
          margin: 0;
          padding: 0;
        }
        .dash-period-select:focus-visible {
          outline: none;
        }
        /* Fade transition for data containers */
        @keyframes dashFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dash-data-fade {
          animation: dashFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .leaderboard-row {
          transition: background-color 0.2s ease;
        }
        .leaderboard-row:hover {
          background-color: #f8fafc !important;
          cursor: pointer;
        }
        .task-item-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .task-item-card:hover {
          transform: translateY(-2px);
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(148, 163, 184, 0.08);
        }
        .dash-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .dash-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .dash-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .dash-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @media (max-width: 1200px) {
          .dash-grid-6-kpi {
            grid-template-columns: repeat(3, 1fr);
          }
          .dash-row-grid {
            grid-template-columns: 1fr;
            display: flex;
            flex-direction: column;
          }
          .col-span-8, .col-span-10, .col-span-6, .col-span-12, .col-span-7, .col-span-5, .col-span-17, .col-span-14, .col-span-24 {
            grid-column: span 24 !important;
          }
        }
        @media (max-width: 768px) {
          .dash-grid-6-kpi {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .dash-grid-6-kpi {
            grid-template-columns: 1fr;
          }
        }
        .col-span-8 { grid-column: span 8; }
        .col-span-10 { grid-column: span 10; }
        .col-span-6 { grid-column: span 6; }
        .col-span-12 { grid-column: span 12; }
        .col-span-7 { grid-column: span 7; }
        .col-span-5 { grid-column: span 5; }
        .col-span-17 { grid-column: span 17; }
        .col-span-14 { grid-column: span 14; }
        .col-span-24 { grid-column: span 24; }

        .hide-mobile-border {
          border-right: 1px solid #e2e8f0;
        }
        @media (max-width: 768px) {
          .hide-mobile-border {
            border-right: none;
            padding-right: 0;
            margin-bottom: 8px;
          }
        }
      `}</style>

      {/* KPI Cards Grid */}
      <div className="dash-grid-6-kpi">
        {kpis.map((k, i) => (
          <div key={i} className="enterprise-kpi-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: k.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {k.icon}
                </div>
                <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <MoreHorizontal size={16} />
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>{k.label}</div>
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1.1, margin: '6px 0 2px' }}>
                {k.val}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: k.isUp ? '#10b981' : '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {k.isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    <span>{k.change}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '0.68rem' }}>vs last month</span>
                </div>
                <Sparkline data={k.sparklineData} color={k.color} />
            </div>
          </div>
        </div>
      ))}
    </div>

      {/* Executive Insights Banner */}
      <div className="dash-card" style={{ 
        padding: '16px 24px', 
        marginBottom: '24px', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        alignItems: isMobile ? 'flex-start' : 'center', 
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: isMobile ? '0' : '16px', borderRight: isMobile ? 'none' : '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="white" />
          </div>
          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '-0.3px' }}>Executive Insights</span>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: '16px', 
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          flex: 1,
          minWidth: 0
        }}>
          {/* Item 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a', flexShrink: 0 }}>
              <AlertTriangle size={14} color="#d97706" />
            </div>
            <div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginRight: '4px' }}>23</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Leads inactive for</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>7+ days</div>
            </div>
          </div>
          
          {/* Item 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: isMobile ? 'none' : '1px solid #f1f5f9', paddingLeft: isMobile ? '0' : '16px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0', flexShrink: 0 }}>
              <TrendingUp size={14} color="#059669" />
            </div>
            <div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginRight: '4px' }}>12</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Bookings likely</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>this week</div>
            </div>
          </div>

          {/* Item 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: isMobile ? 'none' : '1px solid #f1f5f9', paddingLeft: isMobile ? '0' : '16px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecdd3', flexShrink: 0 }}>
              <Briefcase size={14} color="#dc2626" />
            </div>
            <div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginRight: '4px' }}>₹18.6 Cr</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Revenue at risk</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>from delayed deals</div>
            </div>
          </div>

          {/* Item 4 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: isMobile ? 'none' : '1px solid #f1f5f9', paddingLeft: isMobile ? '0' : '16px', flexShrink: 0 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', flexShrink: 0 }}>
              <CheckSquare size={14} color="#2563eb" />
            </div>
            <div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', marginRight: '4px' }}>3</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Approvals</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>pending</div>
            </div>
          </div>
        </div>

        <button style={{ 
          background: 'none', 
          border: 'none', 
          color: '#2563eb', 
          fontWeight: 800, 
          fontSize: '0.8rem', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          marginLeft: isMobile ? '0' : 'auto',
          flexShrink: 0
        }}>
          View All Insights <ArrowRight size={14} />
        </button>
      </div>

      {/* Row 3: Revenue Command Center (Left) & Forecast + Source Stack (Right) */}
      <div className="dash-row-grid" style={{ marginBottom: '24px' }}>
        {/* Left Column: Revenue Command Center Card */}
        <div className="dash-card col-span-17" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="12" y1="20" x2="12" y2="8" />
              <line x1="18" y1="20" x2="18" y2="3" />
            </svg>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px' }}>Revenue Command Center</span>
          </div>

          {/* Sub-Metrics Grid of 4 Items */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: '24px',
            marginBottom: '24px',
            alignItems: 'start'
          }}>
            {/* Stat 1 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderRight: isMobile ? 'none' : '1px solid #f1f5f9',
              paddingRight: isMobile ? '0' : '16px'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Total Revenue (This Year)</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>₹78.5 Cr</span>
              <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.62rem' }}>▲</span> 14.6% <span style={{ color: '#94a3b8', fontWeight: 650 }}>vs last year</span>
              </span>
            </div>

            {/* Stat 2 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderRight: isMobile ? 'none' : '1px solid #f1f5f9',
              paddingRight: isMobile ? '0' : '16px'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Forecast (30 Days)</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>₹18.2 Cr</span>
              <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '0.62rem' }}>▲</span> 16.8%
              </span>
            </div>

            {/* Stat 3 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              borderRight: isMobile ? 'none' : '1px solid #f1f5f9',
              paddingRight: isMobile ? '0' : '16px'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Target (This Year)</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>₹100 Cr</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>78.5% Achieved</span>
              <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', width: '100%', overflow: 'hidden', marginTop: '2px' }}>
                <div style={{ height: '100%', width: '78.5%', background: '#2563eb', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Stat 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Achieved (This Year)</span>
              <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>78.5%</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>₹78.5 Cr of ₹100 Cr</span>
            </div>
          </div>

          {/* Custom Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingLeft: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              <span style={{ width: '12px', height: '6px', borderRadius: '3px', background: '#3b82f6', display: 'inline-block' }} />
              <span>Revenue (Cr)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              <span style={{ width: '12px', height: '0px', borderTop: '2px dashed #94a3b8', display: 'inline-block' }} />
              <span>Target (Cr)</span>
            </div>
          </div>

          {/* Revenue Trend Main Line Chart */}
          <div key={revenuePeriod} className="dash-data-fade" style={{ height: '230px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueTrendGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} domain={[0, 135]} ticks={[0, 25, 50, 75, 100, 125]} />
                <Tooltip content={<CustomRevenueTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueTrendGlow)" dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Stack of Forecast (Sparkline) and Revenue by Source (Donut) */}
        <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Revenue Forecast Sparkline Card */}
          <div className="dash-card" style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '110px',
            boxShadow: '0 4px 12px rgba(148, 163, 184, 0.03)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>Revenue Forecast</span>
              <span style={{
                fontSize: '0.6rem',
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '2px 6px',
                borderRadius: '12px',
                fontWeight: 800
              }}>
                High Confidence
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>₹18.2 Cr</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>Next 30 Days</span>
            </div>
            <div style={{ width: '100%', height: '36px', marginTop: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastSparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} fill="url(#forecastGlow)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Source Card */}
          <div className="dash-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Revenue by Source</span>
              <div className="dash-period-select-wrapper">
                <select
                  className="dash-period-select"
                  value={revenueSourcePeriod}
                  onChange={(e) => setRevenueSourcePeriod(e.target.value)}
                  aria-label="Revenue by Source time period"
                >
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', flex: 1 }}>
              <div style={{ height: '115px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={revenueSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {revenueSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                {revenueSourceData.map((source, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', width: '45%' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: source.color, flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap' }}>{source.name}</span>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 800, width: '20%', textAlign: 'right' }}>
                      {source.value}%
                    </div>
                    <div style={{ color: '#64748b', fontWeight: 600, width: '35%', textAlign: 'right' }}>
                      {source.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Sales Funnel & AI Insights */}
      <div className="dash-row-grid">
        {/* Sales Funnel Card */}
        <div className="dash-card col-span-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Sales Funnel</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={funnelPeriod}
                onChange={(e) => setFunnelPeriod(e.target.value)}
                aria-label="Sales Funnel time period"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>
          
          <div key={funnelPeriod} className="dash-data-fade" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {funnelData.map((f, idx) => (
              <FunnelSegment
                key={idx}
                label={f.label}
                count={f.count}
                percentage={f.percentage}
                color={f.color}
                clipPath={f.clipPath}
                width={f.width}
              />
            ))}
          </div>
        </div>

        {/* Business Health Score & Critical Alerts Column */}
        <div className="col-span-12" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Business Health Score Card */}
          <div className="dash-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Business Health Score</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '16px' }}>
              {/* Radial Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="70" height="70" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="16" 
                      fill="none" 
                      stroke="url(#healthGrad)" 
                      strokeWidth="3.2" 
                      strokeDasharray="100" 
                      strokeDashoffset="14" 
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>86%</span>
                </div>
                
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Excellent</div>
                  <ChevronDown size={14} color="#64748b" style={{ marginTop: '2px', cursor: 'pointer' }} />
                </div>
              </div>

              {/* Sparkline Chart */}
              <div style={{ width: '120px', height: '40px' }}>
                <svg width="120" height="40" viewBox="0 0 120 40">
                  <path 
                    d="M0,32 Q15,28 30,26 T60,18 T90,13 T120,4" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="2.2" 
                    strokeLinecap="round" 
                  />
                  <path 
                    d="M0,32 Q15,28 30,26 T60,18 T90,13 T120,4 L120,40 L0,40 Z" 
                    fill="url(#trendFill)" 
                  />
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Revenue Health</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>Good</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Lead Health</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>Excellent</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Team Performance</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>Good</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Conversion Health</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981' }}>Good</span>
              </div>
            </div>
          </div>

          {/* Critical Alerts Card */}
          <div className="dash-card" style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fee2e2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#dc2626', letterSpacing: '-0.2px' }}>Critical Alerts</span>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                View All
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={14} color="#f97316" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>23 Leads inactive &gt; 7 days</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={14} color="#f97316" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>12 Deals at risk of closing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={14} color="#f97316" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>3 High value approvals pending</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Row 5: Top Performing Projects & Booking Trend */}
      <div className="dash-row-grid">
        {/* Top Performing Projects */}
        <div className="dash-card col-span-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Top Performing Projects</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={projectsPeriod}
                onChange={(e) => setProjectsPeriod(e.target.value)}
                aria-label="Top Projects time period"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>

          <div key={projectsPeriod} className="dash-data-fade" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topProjectsData.map((project, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: '12px' }}>
                  <img src={project.img} alt={project.name} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{project.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{project.bookings}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>
                    {project.value}
                  </div>
                </div>
                <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', width: '100%', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${project.progress}%`, background: project.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Trend Card */}
        <div className="dash-card col-span-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Booking Trend</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={bookingPeriod}
                onChange={(e) => setBookingPeriod(e.target.value)}
                aria-label="Booking Trend time period"
              >
                <option value="this_year">This Year</option>
                <option value="this_month">This Month</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1.1 }}>128</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>Total Bookings</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.75rem', fontWeight: 800, background: '#ecfdf5', padding: '3px 8px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                <ArrowUp size={12} />
                <span>8.3% <span style={{ color: '#059669', fontWeight: 600 }}>vs last year</span></span>
              </div>
            </div>

            <div style={{ height: '145px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrendData} margin={{ top: 5, right: 10, left: -26, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="bookings" fill="#3b82f6" barSize={12} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Team Performance & Live Activities */}
      <div className="dash-row-grid">
        {/* Team Performance Leaderboard */}
        <div className="dash-card col-span-14">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Team Performance</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={teamPeriod}
                onChange={(e) => setTeamPeriod(e.target.value)}
                aria-label="Team Performance time period"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>

          <div key={teamPeriod} className="dash-data-fade" style={{ overflowX: 'auto', marginBottom: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Leads</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Site Visits</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Bookings</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Conversion</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Revenue (Cr)</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}> </th>
                </tr>
              </thead>
              <tbody>
                {teamData.map((agent, idx) => (
                  <tr key={idx} className="leaderboard-row" style={{ borderBottom: idx === teamData.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={agent.img}
                        alt={agent.name}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{agent.name}</span>
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.leads}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.visits}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.bookings}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textAlign: 'right' }}>{agent.conversion}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{agent.revenue}</td>
                    <td style={{ padding: '8px 4px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Sparkline data={agent.sparklineData} color="#10b981" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button style={{ width: '100%', background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}>
            View Full Leaderboard →
          </button>
        </div>

        {/* Live Activities Feed */}
        <div className="dash-card col-span-10">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Live Activities</span>
            <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          <div className="dash-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '282px', overflowY: 'auto', paddingRight: '4px', paddingTop: '4px' }}>
            {activitiesData.map((act, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: act.bg,
                  color: act.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  {act.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                    <strong style={{ color: '#0f172a' }}>{act.user}</strong> {act.action} <span style={{ fontWeight: 700, color: act.color }}>{act.target}</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    <span>{act.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 7: Lead Source Analytics, Lead Aging & Lead Risk Overview */}
      <div className="dash-row-grid">
        {/* Lead Source Analytics */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Lead Source Analytics</span>
            <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            <div style={{ height: '110px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leadSourceData.map((source, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: source.color }} />
                    <span>{source.name}</span>
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 800 }}>
                    {source.value}% <span style={{ color: '#94a3b8', fontWeight: 500 }}>({source.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lead Aging */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Lead Aging</span>
            <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            <div style={{ position: 'relative', height: '110px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={leadAgingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {leadAgingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>2,847</div>
                <div style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Total Leads</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leadAgingData.map((aging, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: aging.color }} />
                    <span>{aging.name}</span>
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 800 }}>
                    {aging.value}% <span style={{ color: '#94a3b8', fontWeight: 500 }}>({aging.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lead Risk Overview Card */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Lead Risk Overview</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={leadRiskPeriod}
                onChange={(e) => setLeadRiskPeriod(e.target.value)}
                aria-label="Lead Risk Overview filter"
              >
                <option value="all_leads">All Leads</option>
                <option value="hot_leads">Hot Leads</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', height: '100px', width: '100px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Pie
                      data={leadRiskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={34}
                      outerRadius={46}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {leadRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>47</div>
                  <div style={{ fontSize: '0.52rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>At Risk</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {leadRiskData.map((risk, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: risk.color }} />
                      <span>{risk.name}</span>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 850 }}>
                      {risk.value} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({risk.percentage})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>Potential Revenue Risk</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>₹26.5 Lakh</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 8: Inventory Overview */}
      <div className="dash-row-grid">
        {/* Inventory Overview Stacked Grouped Bar */}
        <div className="dash-card col-span-24">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Inventory Overview</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                <span>Sold</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
                <span>Available</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }} />
                <span>Hold</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 2fr', gap: '24px' }}>
            {/* KPI statistics block */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Total Units</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>3,128</div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, flex: 1 }}>Available Units</span>
                  <span style={{ fontSize: '0.62rem', background: '#e6fffa', color: '#0d9488', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>46.6%</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>1,456</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Sold Units</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>1,672</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, flex: 1 }}>Hold Units</span>
                  <span style={{ fontSize: '0.62rem', background: '#fef2f2', color: '#e11d48', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>3.1%</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>96</div>
              </div>
            </div>

            {/* Stacked grouped bar chart */}
            <div style={{ height: '140px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryChartData} margin={{ top: 10, right: 10, left: -26, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#94a3b8', fontSize: 7, fontWeight: 700, angle: -12, textAnchor: 'end' } as any} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <Tooltip content={<CustomInventoryTooltip />} />
                  <Bar dataKey="sold" stackId="invStack" fill="#10b981" barSize={14} radius={[0, 0, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="available" stackId="invStack" fill="#3b82f6" barSize={14} isAnimationActive={false} />
                  <Bar dataKey="hold" stackId="invStack" fill="#f59e0b" barSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Row 9: Sales Target, AI Recommendation, Tasks & Approvals */}
      <div className="dash-row-grid">
        {/* Sales Target vs Achievement Radial Gauge */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Sales Target vs Achievement</span>
            <div className="dash-period-select-wrapper">
              <select
                className="dash-period-select"
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value)}
                aria-label="Sales Target time period"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>

          <div key={targetPeriod} className="dash-data-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '120px', height: '90px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={radialTargetData}
                    cx="50%"
                    cy="90%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={38}
                    outerRadius={50}
                    paddingAngle={0}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{targetDataCalculated.percentage}%</div>
                <div style={{ fontSize: '0.52rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Achievement</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Target</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>₹{targetDataCalculated.target} Cr</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Achieved</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#10b981' }}>₹{targetDataCalculated.achieved} Cr</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Remaining</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ef4444' }}>₹{targetDataCalculated.remaining} Cr</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation Card */}
        <div className="dash-card col-span-8" style={{
          background: 'linear-gradient(135deg, #fdfcff 0%, #f5f3ff 100%)',
          border: '1px solid #ddd6fe',
          boxShadow: '0 4px 18px rgba(139, 92, 246, 0.04)',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#8b5cf6" />
              <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#8b5cf6', letterSpacing: '-0.2px' }}>AI Recommendation</span>
            </div>
            <ChevronDown size={14} style={{ color: '#94a3b8', transform: 'rotate(180deg)' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                Site visits from <br /> Google Ads convert
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b', margin: '8px 0 4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                42% <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>higher.</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, lineHeight: 1.3 }}>
                Increase budget by 15% <br /> to get more qualified leads.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '70px', paddingBottom: '4px', flexShrink: 0 }}>
              <div style={{ width: '8px', height: '24px', background: '#8b5cf6', borderRadius: '4px' }} />
              <div style={{ width: '8px', height: '36px', background: '#8b5cf6', borderRadius: '4px' }} />
              <div style={{ width: '8px', height: '48px', background: '#8b5cf6', borderRadius: '4px' }} />
              <div style={{ width: '8px', height: '60px', background: '#8b5cf6', borderRadius: '4px' }} />
            </div>
          </div>

          <button style={{
            width: '100%',
            background: '#6366f1',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
            marginTop: 'auto'
          }}>
            Optimize Budget
          </button>
        </div>

        {/* Tasks & Approvals */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Tasks & Approvals</span>
            <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasksList.map((task, idx) => (
              <div key={idx} className="task-item-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#f59e0b' }}>{task.count}</span>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>{task.label}</span>
                </div>
                <ChevronRight size={14} style={{ color: '#94a3b8' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
