import { useMemo } from 'react';
import FunnelSegment from './shared/FunnelSegment';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

interface SalesFunnelProps {
  data: any;
  funnelPeriod: PeriodValue;
  onFunnelPeriodChange: (v: PeriodValue) => void;
}

export default function SalesFunnel({ data, funnelPeriod, onFunnelPeriodChange }: SalesFunnelProps) {
  const funnelData = useMemo(() => {
    const stages = data?.stages || [];
    const stageCounts = stages.reduce((acc: any, s: any) => {
      acc[s.stage] = Number(s.count || 0);
      return acc;
    }, {});

    const newLeads = stageCounts['New Lead'] || stageCounts['New'] || 0;
    const connected = stageCounts['Connected'] || stageCounts['Contacted'] || 0;
    const qualified = stageCounts['Qualified'] || 0;
    const siteVisits = (stageCounts['Site Visit Scheduled'] || 0) + (stageCounts['Site Visit Done'] || 0) + (stageCounts['Site Visit'] || 0);
    const negotiation = stageCounts['Negotiation'] || 0;
    const bookings = stageCounts['Won'] || 0;

    // Total leads at each step (accumulated to reflect flow)
    const stepLeads = newLeads + connected + qualified + siteVisits + negotiation + bookings;
    const stepQualified = qualified + siteVisits + negotiation + bookings;
    const stepVisits = siteVisits + negotiation + bookings;
    const stepNegotiation = negotiation + bookings;
    const stepBookings = bookings;

    return [
      { label: 'Leads', count: stepLeads, width: '100%', color: '#6366f1', clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' },
      { label: 'Qualified', count: stepQualified, percentage: stepLeads ? `${Math.round((stepQualified/stepLeads)*100)}%` : '0%', width: '100%', color: '#3b82f6', clipPath: 'polygon(15% 0%, 85% 0%, 75% 100%, 25% 100%)' },
      { label: 'Site Visits', count: stepVisits, percentage: stepQualified ? `${Math.round((stepVisits/stepQualified)*100)}%` : '0%', width: '100%', color: '#06b6d4', clipPath: 'polygon(25% 0%, 75% 0%, 65% 100%, 35% 100%)' },
      { label: 'Negotiation', count: stepNegotiation, percentage: stepVisits ? `${Math.round((stepNegotiation/stepVisits)*100)}%` : '0%', width: '100%', color: '#10b981', clipPath: 'polygon(35% 0%, 65% 0%, 58% 100%, 42% 100%)' },
      { label: 'Bookings', count: stepBookings, percentage: stepNegotiation ? `${Math.round((stepBookings/stepNegotiation)*100)}%` : '0%', width: '100%', color: '#f59e0b', clipPath: 'polygon(42% 0%, 58% 0%, 53% 100%, 47% 100%)' }
    ];
  }, [data?.stages]);

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
