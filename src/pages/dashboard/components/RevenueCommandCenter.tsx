import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomRevenueTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue, DashCardProps } from './shared/types';

interface RevenueCommandCenterProps extends DashCardProps {
  revenuePeriod: PeriodValue;
  onRevenuePeriodChange: (v: PeriodValue) => void;
  revenueTrendData: Array<{ name: string; revenue: number; target: number }>;
}

export default function RevenueCommandCenter({
  isMobile,
  revenuePeriod,
  onRevenuePeriodChange,
  revenueTrendData,
}: RevenueCommandCenterProps) {
  const periodLabel =
    revenuePeriod === 'this_year' ? 'This Year Performance Overview'
    : revenuePeriod === 'this_month' ? 'This Month Performance Overview'
    : 'This Quarter Performance Overview';

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
          <span className="dash-revenue-stat-label">Total Revenue (This Year)</span>
          <span className="dash-revenue-stat-value">₹78.5 Cr</span>
          <span className="dash-revenue-stat-trend">
            <span style={{ fontSize: '0.62rem' }}>▲</span> 14.6% <span className="dash-revenue-stat-trend-muted">vs last year</span>
          </span>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Forecast (30 Days)</span>
          <span className="dash-revenue-stat-value">₹18.2 Cr</span>
          <span className="dash-revenue-stat-trend">
            <span style={{ fontSize: '0.62rem' }}>▲</span> 16.8%
          </span>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Target (This Year)</span>
          <span className="dash-revenue-stat-value">₹100 Cr</span>
          <span className="dash-revenue-achieved">78.5% Achieved</span>
          <div className="dash-revenue-progress-bar">
            <div className="dash-revenue-progress-fill" style={{ width: '78.5%' }} />
          </div>
        </div>
        <div className="dash-revenue-stat">
          <span className="dash-revenue-stat-label">Achieved (This Year)</span>
          <span className="dash-revenue-stat-value">78.5%</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: 2 }}>₹78.5 Cr of ₹100 Cr</span>
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
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} domain={[0, 150]} ticks={[0, 25, 50, 75, 100, 125, 150]} />
            <Tooltip content={<CustomRevenueTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueTrendGlow)" dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
