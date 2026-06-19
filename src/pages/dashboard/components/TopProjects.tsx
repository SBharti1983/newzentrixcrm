import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

interface TopProjectsProps {
  data: any;
  projectsPeriod: PeriodValue;
  onProjectsPeriodChange: (v: PeriodValue) => void;
}

const PROJECT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ef4444'];
const PROJECT_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=100&auto=format&fit=crop&q=60',
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

    const maxVal = Math.max(...raw.map((p: any) => Number(p.total_value) || 0), 1);

    return raw.map((p: any, idx: number) => ({
      name: p.name || 'Unknown Project',
      bookings: `${p.bookings_count || 0} Bookings`,
      value: formatValue(Number(p.total_value) || 0),
      progress: Math.round(((Number(p.total_value) || 0) / maxVal) * 100),
      color: PROJECT_COLORS[idx % PROJECT_COLORS.length],
      img: PROJECT_IMAGES[idx % PROJECT_IMAGES.length],
    }));
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

      <div key={projectsPeriod} className="dash-data-fade dash-project-list">
        {topProjectsData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>No project data available</div>
        )}
        {topProjectsData.map((project, idx) => (
          <div key={idx} className="dash-project-item" onClick={() => navigate('/projects')}>
            <div className="dash-project-top">
              <img src={project.img} alt={project.name} className="dash-project-img" />
              <div className="dash-project-info">
                <div className="dash-project-name">{project.name}</div>
                <div className="dash-project-bookings">{project.bookings}</div>
              </div>
              <div className="dash-project-value">{project.value}</div>
            </div>
            <div className="dash-project-bar-track">
              <div className="dash-project-bar-fill" style={{ width: `${project.progress}%`, background: project.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
