import React from 'react';
import FunnelSegment from './shared/FunnelSegment';
import PeriodSelect from './shared/PeriodSelect';
import { FunnelItem, PeriodValue } from './shared/types';

interface SalesFunnelProps {
  funnelPeriod: PeriodValue;
  onFunnelPeriodChange: (v: PeriodValue) => void;
  funnelData: FunnelItem[];
}

export default function SalesFunnel({ funnelPeriod, onFunnelPeriodChange, funnelData }: SalesFunnelProps) {
  return (
    <div className="dash-card col-span-12">
      <div className="dash-card-hdr">
        <h3 className="dash-card-hdr-title">Sales Funnel</h3>
        <PeriodSelect
          value={funnelPeriod}
          onChange={onFunnelPeriodChange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'this_week', label: 'This Week' },
            { value: 'this_month', label: 'This Month' },
            { value: 'last_month', label: 'Last Month' },
            { value: 'this_quarter', label: 'This Quarter' },
            { value: 'this_year', label: 'This Year' },
          ]}
          ariaLabel="Sales Funnel time period"
        />
      </div>

      <div key={funnelPeriod} className="dash-data-fade" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
  );
}
