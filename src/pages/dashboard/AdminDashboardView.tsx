import React, { useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Cell,
  PieChart, Pie, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, Users, Target, ChevronDown, DollarSign, Activity, Sparkles, Zap, 
  ShieldCheck, Clock, AlertCircle, ArrowUpRight, AlertTriangle, Briefcase, 
  CheckSquare, ArrowRight, MoreHorizontal, Calendar, ArrowUp, ArrowDown, Percent,
  ChevronRight, FileText
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { usePageInfo } from '../../context/PageContext';

// Sub-component: Area sparkline for KPI cards
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
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
};

// Sub-component: Sales Funnel clip-path layer
const FunnelSegment = ({ label, count, percentage, color, clipPath, width }: {
  label: string;
  count: number;
  percentage?: string;
  color: string;
  clipPath: string;
  width: string;
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '38px', margin: '2px 0' }}>
      <div style={{ width: '55%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{
          width: width,
          height: '100%',
          background: color,
          clipPath: clipPath,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 800,
          fontSize: '0.75rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
        }}>
          {label}
        </div>
      </div>
      <div style={{ width: '45%', paddingLeft: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
          {Number(count).toLocaleString()}
        </span>
        {percentage && (
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            {percentage}
          </span>
        )}
      </div>
    </div>
  );
};

// Sub-component: Custom tooltip for Revenue Trend AreaChart
const CustomRevenueTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '14px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        fontSize: '0.8rem',
        fontWeight: 700
      }}>
        <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.85rem', marginBottom: '8px' }}>
          {data.name} 2024
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
          <span style={{ color: '#64748b' }}>Revenue:</span>
          <span style={{ color: '#0f172a', fontWeight: 800 }}>₹{data.revenue} Cr</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ width: '8px', height: '2px', background: '#94a3b8' }} />
          <span style={{ color: '#64748b' }}>Target:</span>
          <span style={{ color: '#0f172a', fontWeight: 800 }}>₹{data.target} Cr</span>
        </div>
        <div style={{ 
          background: 'rgba(16, 185, 129, 0.08)', 
          color: '#10b981', 
          padding: '4px 8px', 
          borderRadius: '8px', 
          display: 'inline-block',
          fontSize: '0.72rem',
          fontWeight: 800
        }}>
          • Achievement: {Math.round(data.revenue * 100 / data.target)}%
        </div>
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
    const bookingsCount = bookings.total || 128;
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

  // Funnel segments
  const funnelData = [
    { label: 'Leads', count: 8642, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
    { label: 'Qualified', count: 2847, percentage: '32.9%', width: '85%', color: '#3b82f6', clipPath: 'polygon(0% 0%, 100% 0%, 82% 100%, 18% 100%)' },
    { label: 'Site Visits', count: 1562, percentage: '55.0%', width: '70%', color: '#06b6d4', clipPath: 'polygon(0% 0%, 100% 0%, 78% 100%, 22% 100%)' },
    { label: 'Negotiation', count: 568, percentage: '36.4%', width: '55%', color: '#10b981', clipPath: 'polygon(0% 0%, 100% 0%, 72% 100%, 28% 100%)' },
    { label: 'Bookings', count: 128, percentage: '22.5%', width: '40%', color: '#f59e0b', clipPath: 'polygon(0% 0%, 100% 0%, 62% 100%, 38% 100%)' }
  ];

  // Revenue trend vs target over 12 months
  const revenueTrendData = [
    { name: 'Jan', revenue: 42, target: 50 },
    { name: 'Feb', revenue: 48, target: 55 },
    { name: 'Mar', revenue: 58, target: 60 },
    { name: 'Apr', revenue: 70, target: 65 },
    { name: 'May', revenue: 78.5, target: 68 },
    { name: 'Jun', revenue: 85, target: 75 },
    { name: 'Jul', revenue: 92, target: 82 },
    { name: 'Aug', revenue: 105, target: 90 },
    { name: 'Sep', revenue: 112, target: 95 },
    { name: 'Oct', revenue: 120, target: 100 },
    { name: 'Nov', revenue: 128, target: 110 },
    { name: 'Dec', revenue: 140, target: 120 }
  ];

  // Top Performing Projects
  const topProjectsData = [
    { name: 'Green Vista', bookings: '128 Bookings', value: '₹32.5 Cr', progress: 100, color: '#10b981', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60' },
    { name: 'Sunrise Residency', bookings: '74 Bookings', value: '₹18.7 Cr', progress: 58, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60' },
    { name: 'Maple Heights', bookings: '38 Bookings', value: '₹12.4 Cr', progress: 38, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60' },
    { name: 'Skyline Towers', bookings: '18 Bookings', value: '₹8.2 Cr', progress: 25, color: '#f59e0b', img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=100&auto=format&fit=crop&q=60' },
    { name: 'Riverfront Phase 2', bookings: '24 Bookings', value: '₹6.1 Cr', progress: 19, color: '#06b6d4', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&auto=format&fit=crop&q=60' }
  ];

  // Team Leaderboard
  const teamData = [
    { name: 'Rahul Sharma', leads: 156, visits: 48, bookings: 12, conversion: '8.3%', initials: 'RS' },
    { name: 'Priya Singh', leads: 142, visits: 42, bookings: 11, conversion: '7.7%', initials: 'PS' },
    { name: 'Amit Verma', leads: 135, visits: 38, bookings: 9, conversion: '6.7%', initials: 'AV' },
    { name: 'Neha Kapoor', leads: 118, visits: 33, bookings: 8, conversion: '6.8%', initials: 'NK' },
    { name: 'Vikram Patel', leads: 105, visits: 28, bookings: 6, conversion: '5.7%', initials: 'VP' }
  ];

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
    { user: 'Rohit Kumar', action: 'booked Unit B120', target: 'Green Vista', time: '2m ago', initials: 'RK', color: '#10b981', bg: '#ecfdf5' },
    { user: 'Neha', action: 'completed site visit for', target: 'Amit Verma', time: '15m ago', initials: 'NK', color: '#3b82f6', bg: '#eff6ff' },
    { user: 'System Auto', action: 'assigned new lead to', target: 'Rahul', time: '28m ago', initials: 'SA', color: '#f59e0b', bg: '#fffbeb' },
    { user: 'Amit Verma', action: 'moved deal to', target: 'Negotiation', time: '45m ago', initials: 'AV', color: '#8b5cf6', bg: '#f5f3ff' },
    { user: 'Accounts', action: 'received payment of ₹25,00,000 for', target: 'Unit A502 - Skyline Towers', time: '1h ago', initials: 'AC', color: '#06b6d4', bg: '#ecfeff' }
  ];

  // Grouped Stacked Bar chart for projects inventory
  const inventoryChartData = [
    { name: 'Green Vista', sold: 180, available: 150, hold: 20 },
    { name: 'Sunrise', sold: 140, available: 120, hold: 15 },
    { name: 'Maple Heights', sold: 110, available: 90, hold: 12 },
    { name: 'Skyline', sold: 90, available: 110, hold: 10 },
    { name: 'Riverfront', sold: 120, available: 130, hold: 8 },
    { name: 'Lakeview', sold: 100, available: 80, hold: 14 },
    { name: 'Orchard Estate', sold: 80, available: 95, hold: 6 }
  ];

  // Radial target gauge achieved segments
  const radialTargetData = [
    { name: 'Achieved', value: 78, color: '#10b981' },
    { name: 'Remaining', value: 22, color: '#f1f5f9' }
  ];

  // Tasks checklist
  const tasksList = [
    { count: 3, label: 'Booking approvals pending' },
    { count: 5, label: 'KYC verifications pending' },
    { count: 7, label: 'Document uploads pending' },
    { count: 2, label: 'Payment follow-ups' }
  ];

  return (
    <div className="dash-premium-container" style={{ padding: isMobile ? '16px' : '36px 40px' }}>
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
          padding: 20px 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 145px;
        }
        .enterprise-kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(148, 163, 184, 0.08);
          border-color: #cbd5e1;
        }
        .dash-row-grid {
          display: grid;
          grid-template-columns: repeat(24, 1fr);
          gap: 24px;
          margin-bottom: 24px;
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
          .col-span-8, .col-span-10, .col-span-6, .col-span-12, .col-span-7, .col-span-5 {
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs last month</span>
                </div>
                <Sparkline data={k.sparklineData} color={k.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Executive Insights Banner */}
      <div className="dash-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '20px' }} className="hide-mobile-border">
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="white" />
          </div>
          <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', letterSpacing: '-0.3px' }}>Executive Insights</span>
        </div>

        <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around', flexWrap: 'wrap', gap: '16px', minWidth: '250px' }}>
          {/* Item 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fde68a' }}>
              <AlertTriangle size={16} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>23</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Leads inactive for 7+ days</div>
            </div>
          </div>
          
          {/* Item 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0' }}>
              <TrendingUp size={16} color="#059669" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>12</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Bookings likely this week</div>
            </div>
          </div>

          {/* Item 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecdd3' }}>
              <Briefcase size={16} color="#dc2626" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>₹18.6 Cr</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Revenue at risk from delayed deals</div>
            </div>
          </div>

          {/* Item 4 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
              <CheckSquare size={16} color="#2563eb" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>3</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Approvals pending</div>
            </div>
          </div>
        </div>

        <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          View All Insights <ArrowRight size={14} />
        </button>
      </div>

      {/* Row 1 Charts: Funnel, Trend, Projects */}
      <div className="dash-row-grid">
        {/* Sales Funnel Card */}
        <div className="dash-card col-span-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Sales Funnel</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>This Month</span>
              <ChevronDown size={14} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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

        {/* Revenue Trend Chart Card */}
        <div className="dash-card col-span-10">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Revenue Trend</span>
              <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span>Revenue (Cr)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                  <span style={{ width: '8px', height: '2px', background: '#94a3b8' }} />
                  <span>Target (Cr)</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>This Year</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div style={{ height: '205px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueTrendGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                <Tooltip content={<CustomRevenueTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueTrendGlow)" dot={{ r: 4, strokeWidth: 1, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Projects */}
        <div className="dash-card col-span-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Top Performing Projects</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>This Month</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
      </div>

      {/* Row 2 Charts: Leaderboard, Source, Aging, Timeline */}
      <div className="dash-row-grid" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
        {/* Team Performance Leaderboard */}
        <div className="dash-card" style={{ gridColumn: 'span 8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Team Performance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>This Month</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Leads</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Visits</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Bookings</th>
                  <th style={{ padding: '8px 4px', fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Conv.</th>
                </tr>
              </thead>
              <tbody>
                {teamData.map((agent, idx) => (
                  <tr key={idx} style={{ borderBottom: idx === teamData.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: ['#fee2e2', '#e0f2fe', '#fef3c7', '#dcfce7', '#f3e8ff'][idx % 5],
                        color: ['#dc2626', '#0284c7', '#d97706', '#16a34a', '#9333ea'][idx % 5],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 800
                      }}>
                        {agent.initials}
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{agent.name.split(' ')[0]}</span>
                    </td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.leads}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.visits}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textAlign: 'right' }}>{agent.bookings}</td>
                    <td style={{ padding: '8px 4px', fontSize: '0.78rem', fontWeight: 800, color: '#10b981', textAlign: 'right' }}>{agent.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button style={{ width: '100%', background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center', marginTop: '4px' }}>
            View Full Leaderboard →
          </button>
        </div>

        {/* Lead Source Analytics */}
        <div className="dash-card" style={{ gridColumn: 'span 5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Lead Source Analytics</span>
            <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ height: '110px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
        <div className="dash-card" style={{ gridColumn: 'span 5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Lead Aging</span>
            <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative', height: '110px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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

        {/* Live Activities Feed */}
        <div className="dash-card" style={{ gridColumn: 'span 6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Live Activities</span>
            <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '240px', overflowY: 'auto', paddingRight: '4px' }}>
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
                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.3 }}>
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

      {/* Row 3: Inventory Overview, Sales Target Radial, Tasks & Approvals */}
      <div className="dash-row-grid" style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}>
        {/* Inventory Overview Stacked Grouped Bar */}
        <div className="dash-card" style={{ gridColumn: 'span 12' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px' }}>
            {/* KPI statistics block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                  <Bar dataKey="sold" stackId="invStack" fill="#10b981" barSize={14} radius={[0, 0, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="available" stackId="invStack" fill="#3b82f6" barSize={14} isAnimationActive={false} />
                  <Bar dataKey="hold" stackId="invStack" fill="#f59e0b" barSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales Target vs Achievement Radial Gauge */}
        <div className="dash-card" style={{ gridColumn: 'span 6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Sales Target vs Achievement</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>
              <span>This Year</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
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
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>78%</div>
                <div style={{ fontSize: '0.52rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>Achievement</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Target</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>₹180 Cr</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Achieved</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#10b981' }}>₹140.4 Cr</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Remaining</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ef4444' }}>₹39.6 Cr</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks & Approvals */}
        <div className="dash-card" style={{ gridColumn: 'span 6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>Tasks & Approvals</span>
            <button style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
              View All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasksList.map((task, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }} className="hover-bg-slate">
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
