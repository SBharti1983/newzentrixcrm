import React from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityItem } from './shared/types';

interface LiveActivitiesProps {
  activitiesData: ActivityItem[];
}

export default function LiveActivities({ activitiesData }: LiveActivitiesProps) {
  const navigate = useNavigate();

  return (
    <div className="dash-card col-span-10">
      <div className="dash-card-hdr">
        <h3 className="dash-card-hdr-title">Live Activities</h3>
        <button className="dash-view-all-btn" onClick={() => navigate('/leads')}>View All</button>
      </div>

      <div className="dash-scrollbar dash-activity-list">
        {activitiesData.map((act, idx) => (
          <div key={idx} className="dash-activity-item">
            <div className="dash-activity-avatar" style={{ background: act.bg, color: act.color }}>
              {act.initials}
            </div>
            <div className="dash-activity-content">
              <div className="dash-activity-text">
                <strong className="dash-activity-user">{act.user}</strong> {act.action}{' '}
                <span style={{ fontWeight: 700, color: act.color }}>{act.target}</span>
              </div>
              <div className="dash-activity-time">
                <Clock size={10} />
                <span>{act.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
