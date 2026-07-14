import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveActivitiesProps {
  data: any;
}

const ACTIVITY_STYLES: Record<string, { color: string; bg: string }> = {
  created: { color: '#10b981', bg: '#ecfdf5' },
  updated: { color: '#3b82f6', bg: '#eff6ff' },
  deleted: { color: '#ef4444', bg: '#fef2f2' },
  status_change: { color: '#f59e0b', bg: '#fffbeb' },
  default: { color: '#8b5cf6', bg: '#f5f3ff' },
};

const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function LiveActivities({ data }: LiveActivitiesProps) {
  const navigate = useNavigate();

  const activitiesData = useMemo(() => {
    const raw: any[] = data?.activities || [];
    if (!raw.length) {
      // Fallback static data
      return [
        { user: 'System', action: 'No recent activities', target: '', time: '', initials: 'SY', color: '#94a3b8', bg: '#f1f5f9' },
      ];
    }

    return raw.map((act: any) => {
      const style = ACTIVITY_STYLES[act.action] || ACTIVITY_STYLES.default;
      return {
        user: act.user_name || 'System',
        action: `${act.action || 'interacted with'}`,
        target: act.entity_type || '',
        time: formatTimeAgo(act.created_at),
        initials: getInitials(act.user_name || 'System'),
        color: style.color,
        bg: style.bg,
      };
    });
  }, [data?.activities]);

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
              {act.time && (
                <div className="dash-activity-time">
                  <Clock size={10} />
                  <span>{act.time}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
