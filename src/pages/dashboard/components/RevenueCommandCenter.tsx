import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomRevenueTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue, DashCardProps } from './shared/types';

interface RevenueCommandCenterProps extends DashCardProps {
  data: any;
  revenuePeriod: PeriodValue;
  onRevenuePeriodChange: (v: PeriodValue) => void;
}

export default function RevenueCommandCenter({
  data,
  isMobile,
  revenuePeriod,
  onRevenuePeriodChange,
}: RevenueCommandCenterProps) {
  const periodLabel =
    revenuePeriod === 'this_year' ? 'This Year Performance Overview'
    : revenuePeriod === 'this_month' ? 'This Month Performance Overview'
    : 'This Quarter Performance Overview';

  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  const totalRevenueVal = data?.bookings?.total_value ?? 0;
  const forecastVal = (data?.pipeline?.value ?? 0) * 0.15; // 15% estimated conversion of active pipeline
  const targetVal = Math.max(Number(totalRevenueVal) * 1.3, 10000000); // Target is 30% above current revenue or ₹1 Cr minimum

  const achievedPct = targetVal > 0 ? Math.min(100, Math.round((Number(totalRevenueVal) / targetVal) * 1000) / 10) : 0;

  // Build revenue trend chart from booking_trends data (monthly bookings from DB)
  const revenueTrendData = useMemo(() => {
    const rawTrends: any[] = data?.booking_trends || [];
    if (!rawTrends.length) return [];

    const totalBookings = Number(data?.bookings?.total || 0);
    const totalValue = Number(data?.bookings?.total_value || 0);
    const avgValuePerBooking = totalBookings > 0 ? totalValue / totalBookings : 0;

    // Convert bookings per month to approximate revenue (in Cr)
    return rawTrends.map((t: any) => {
      const monthlyBookings = Number(t.bookings || 0);
      const revenueEstimate = (monthlyBookings * avgValuePerBooking) / 10000000; // Convert to Cr
      const targetEstimate = (targetVal / 12) / 10000000; // Monthly target in Cr
      return {
        name: t.name || '',
        revenue: Math.round(revenueEstimate * 100) / 100,
        target: Math.round(targetEstimate * 100) / 100,
      };
    });
  }, [data?.booking_trends, data?.bookings, targetVal]);

  // Auto-calculate Y axis domain
  const yMax = useMemo(() => {
    if (!revenueTrendData.length) return 10;
    const maxVal = Math.max(...revenueTrendData.map(d => Math.max(d.revenue, d.target)));
    return Math.ceil(maxVal * 1.3);
  }, [revenueTrendData]);

  return (
    <div className="dash-card col-span-17" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Header */}
      <div className="dash-revenue-header">
        <div className="dash-revenue-logo-wrap">
          <div className="dash-revenue-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <path d="M3 14l6-6 6 6 6-8" stroke="#2563eb" strokeWidth="2.5" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="dash-revenue-title">Revenue Command Center</span>
            <span className="dash-revenue-sub">{periodLabel}</span>
          </div>
        </div>
        <PeriodSelect
          value={revenuePeriod}
          onChange={onRevenuePeriodChange}
          options={[
            { value: 'this_month', label: 'This Month' },
            { value: 'this_quarter', label: 'This Quarter' },
            { value: 'this_year', label: 'This Year' },
          ]}
          ariaLabel="Revenue period"
        />
      </div>

      {/* Sub-Metrics Grid */}
      <div className="dash-revenue-stats">
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Total Revenue</span>
          <span className="dash-revenue-stat-value">{formatRev(totalRevenueVal)}</span>
          <span className="dash-revenue-stat-trend">
            <span style={{ fontSize: '0.62rem' }}>▲</span> Live <span className="dash-revenue-stat-trend-muted">bookings value</span>
          </span>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Est. Forecast (30 Days)</span>
          <span className="dash-revenue-stat-value">{formatRev(forecastVal)}</span>
          <span className="dash-revenue-stat-trend">
            <span style={{ fontSize: '0.62rem' }}>▲</span> 15% <span className="dash-revenue-stat-trend-muted">pipeline convert</span>
          </span>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Target (Annual)</span>
          <span className="dash-revenue-stat-value">{formatRev(targetVal)}</span>
          <span className="dash-revenue-achieved">{achievedPct}% Achieved</span>
          <div className="dash-revenue-progress-bar">
            <div className="dash-revenue-progress-fill" style={{ width: `${achievedPct}%` }} />
          </div>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Achieved (Annual Target)</span>
          <span className="dash-revenue-stat-value">{achievedPct}%</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>{formatRev(totalRevenueVal)} of {formatRev(targetVal)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="dash-revenue-legend">
        <div className="dash-revenue-legend-item">
          <span className="dash-revenue-legend-line" style={{ background: '#2563eb' }} />
          <span>Revenue (Cr)</span>
        </div>
        <div className="dash-revenue-legend-item">
          <span className="dash-revenue-legend-dashed" />
          <span>Target (Cr)</span>
        </div>
      </div>

      {/* Chart */}
      <div key={revenuePeriod} className="dash-data-fade dash-revenue-chart">
        {revenueTrendData.length > 0 ? (
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
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} domain={[0, yMax]} />
              <Tooltip content={<CustomRevenueTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueTrendGlow)" dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>No revenue trend data available</div>
        )}
      </div>
    </div>
  );
}
