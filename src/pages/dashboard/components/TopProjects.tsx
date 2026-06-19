import React from 'react';
import { useNavigate } from 'react-router-dom';
import PeriodSelect from './shared/PeriodSelect';
import { ProjectItem, PeriodValue } from './shared/types';

interface TopProjectsProps {
  projectsPeriod: PeriodValue;
  onProjectsPeriodChange: (v: PeriodValue) => void;
  topProjectsData: ProjectItem[];
}

export default function TopProjects({ projectsPeriod, onProjectsPeriodChange, topProjectsData }: TopProjectsProps) {
  const navigate = useNavigate();

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
