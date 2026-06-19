import React, { useMemo } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CustomPieTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue, RevenueSource, DashCardProps } from './shared/types';

interface RevenueSidebarProps extends DashCardProps {
  data: any;
  revenueSourcePeriod: PeriodValue;
  onRevenueSourcePeriodChange: (v: PeriodValue) => void;
}

export default function RevenueSidebar({
  data,
  isMobile,
  revenueSourcePeriod,
  onRevenueSourcePeriodChange,
}: RevenueSidebarProps) {
  const forecastSparklineData = useMemo(() => [
    { val: 12.4 }, { val: 13.5 }, { val: 14.2 }, { val: 15.6 }, { val: 16.3 }, { val: 17.1 }, { val: 18.2 }
  ], []);

  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  const forecastVal = (data?.pipeline?.value ?? 0) * 0.15; // 15% estimated pipeline conversion

  const sourceColors: Record<string, string> = {
    'website': '#3b82f6',
    'referral': '#06b6d4',
    'walk-in': '#f59e0b',
    'portal': '#8b5cf6',
    'social media': '#ef4444',
  };

  const revenueSourceData = useMemo(() => {
    const rawSources = data?.lead_sources || [];
    const totalCount = rawSources.reduce((sum: number, s: any) => sum + Number(s.count || 0), 0) || 1;
    return rawSources.map((s: any) => {
      const pct = Math.round((Number(s.count || 0) / totalCount) * 100);
      const color = sourceColors[s.name.toLowerCase()] || '#cbd5e1';
      return {
        name: s.name,
        value: pct,
        amount: `${s.count} Leads`,
        color,
      };
    });
  }, [data?.lead_sources]);

  return (
    <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Revenue Forecast Sparkline Card */}
      <div className="dash-card dash-forecast-card">
        <div className="dash-forecast-header">
          <span className="dash-forecast-label">Revenue Forecast</span>
          <span className="dash-forecast-badge">High Confidence</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
          <span className="dash-forecast-value">{formatRev(forecastVal)}</span>
          <span className="dash-forecast-sub">Next 30 Days</span>
        </div>
        <div className="dash-forecast-chart">
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
        <div className="dash-card-hdr">
          <h3 className="dash-card-hdr-title">Revenue by Source</h3>
          <PeriodSelect
            value={revenueSourcePeriod}
            onChange={onRevenueSourcePeriodChange}
            options={[
              { value: 'this_month', label: 'This Month' },
              { value: 'this_quarter', label: 'This Quarter' },
              { value: 'this_year', label: 'This Year' },
            ]}
            ariaLabel="Revenue by Source time period"
          />
        </div>

        <div className="dash-source-container">
          <div className="dash-source-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie data={revenueSourceData} cx="50%" cy="50%" innerRadius={38} outerRadius={50} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {revenueSourceData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-source-legend">
            {revenueSourceData.map((source: any, idx: number) => (
              <div key={idx} className="dash-source-row">
                <div className="dash-source-name">
                  <span className="dash-source-dot" style={{ background: source.color }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{source.name}</span>
                </div>
                <div className="dash-source-values">
                  <span className="dash-source-pct">{source.value}%</span>
                  <span className="dash-source-amount">{source.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
