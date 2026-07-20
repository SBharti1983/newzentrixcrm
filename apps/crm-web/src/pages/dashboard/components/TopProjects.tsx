import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

interface TopProjectsProps {
  data: any;
  projectsPeriod: PeriodValue;
  onProjectsPeriodChange: (v: PeriodValue) => void;
}

const PROJECT_COLORS = [
  { bar: '#10b981', bg: 'rgba(16,185,129,0.07)', badge: 'rgba(16,185,129,0.12)', text: '#059669' },
  { bar: '#6366f1', bg: 'rgba(99,102,241,0.07)', badge: 'rgba(99,102,241,0.12)', text: '#4f46e5' },
  { bar: '#f59e0b', bg: 'rgba(245,158,11,0.07)', badge: 'rgba(245,158,11,0.12)', text: '#d97706' },
  { bar: '#06b6d4', bg: 'rgba(6,182,212,0.07)', badge: 'rgba(6,182,212,0.12)', text: '#0891b2' },
  { bar: '#ef4444', bg: 'rgba(239,68,68,0.07)', badge: 'rgba(239,68,68,0.12)', text: '#dc2626' },
];

const formatValue = (v: number) => {
  const cr = v / 10000000;
  return cr >= 1 ? `₹${cr.toFixed(1)} Cr` : `₹${(v / 100000).toFixed(1)} L`;
};

export default function TopProjects({ data, projectsPeriod, onProjectsPeriodChange }: TopProjectsProps) {
  const navigate = useNavigate();

  const topProjectsData = useMemo(() => {
    const raw: any[] = data?.top_projects || [];
    if (!raw.length) return [];

    return raw.map((p: any, idx: number) => {
      const totalUnits = Number(p.total_units) || 0;
      const availableUnits = Number(p.available_units) || 0;
      const soldUnits = totalUnits > 0 ? totalUnits - availableUnits : Number(p.bookings_count) || 0;
      const soldPct = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : Number(p.sold_pct) || 0;

      return {
        name: p.name || 'Unknown Project',
        location: p.location || '',
        totalUnits,
        availableUnits,
        soldUnits,
        soldPct,
        bookingsCount: Number(p.bookings_count) || 0,
        revenue: formatValue(Number(p.total_value) || 0),
        rawValue: Number(p.total_value) || 0,
        color: PROJECT_COLORS[idx % PROJECT_COLORS.length],
      };
    });
  }, [data?.top_projects]);

  return (
    <div className="dash-card col-span-12">
      <div className="dash-card-hdr">
        <h3 className="dash-card-hdr-title">Top Performing Projects</h3>
        <PeriodSelect
          value={projectsPeriod}
          onChange={onProjectsPeriodChange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'this_week', label: 'This Week' },
            { value: 'this_month', label: 'This Month' },
            { value: 'last_month', label: 'Last Month' },
            { value: 'this_quarter', label: 'This Quarter' },
            { value: 'this_year', label: 'This Year' },
          ]}
          ariaLabel="Top Projects time period"
        />
      </div>

      <div key={projectsPeriod} className="dash-data-fade dash-project-grid">
        {topProjectsData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, gridColumn: '1 / -1' }}>
            No project data available
          </div>
        )}
        {topProjectsData.map((project, idx) => (
          <div
            key={idx}
            className="dash-project-card"
            style={{ background: project.color.bg, borderColor: project.color.bar + '33' }}
            onClick={() => navigate('/projects')}
          >
            {/* Header row: rank + name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                  background: project.color.bar, color: '#fff',
                  fontSize: '0.65rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.name}
                  </div>
                  {project.location && (
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{project.location}</div>
                  )}
                </div>
              </div>
              {/* Revenue badge */}
              <span style={{
                background: project.color.badge, color: project.color.text,
                fontSize: '0.72rem', fontWeight: 800, borderRadius: '8px',
                padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {project.revenue}
              </span>
            </div>

            {/* Inventory stats row */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{project.totalUnits || project.soldUnits}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>Inventory</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: project.color.text, lineHeight: 1 }}>{project.soldUnits}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>Sold</div>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{project.bookingsCount}</div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase' }}>Bookings</div>
              </div>
            </div>

            {/* Sold % progress bar */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>Sold</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: project.color.text }}>{project.soldPct}%</span>
              </div>
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${project.soldPct}%`, height: '100%',
                  background: project.color.bar, borderRadius: '4px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
