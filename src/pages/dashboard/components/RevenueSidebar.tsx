import React, { useMemo } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CustomPieTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue, RevenueSource, DashCardProps } from './shared/types';

interface RevenueSidebarProps extends DashCardProps {
  revenueSourcePeriod: PeriodValue;
  onRevenueSourcePeriodChange: (v: PeriodValue) => void;
  revenueSourceData: RevenueSource[];
}

export default function RevenueSidebar({
  isMobile,
  revenueSourcePeriod,
  onRevenueSourcePeriodChange,
  revenueSourceData,
}: RevenueSidebarProps) {
  const forecastSparklineData = useMemo(() => [
    { val: 12.4 }, { val: 13.5 }, { val: 14.2 }, { val: 15.6 }, { val: 16.3 }, { val: 17.1 }, { val: 18.2 }
  ], []);

  return (
    <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Revenue Forecast Sparkline Card */}
      <div className="dash-card dash-forecast-card">
        <div className="dash-forecast-header">
          <span className="dash-forecast-label">Revenue Forecast</span>
          <span className="dash-forecast-badge">High Confidence</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
          <span className="dash-forecast-value">₹18.2 Cr</span>
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

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ height: 120, width: isMobile ? '100%' : 120, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie data={revenueSourceData} cx="50%" cy="50%" innerRadius={38} outerRadius={50} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {revenueSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-source-legend">
            {revenueSourceData.map((source, idx) => (
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
