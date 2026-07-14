import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sparkline from './shared/Sparkline';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

const TEAM_IMAGES = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60',
];

interface TeamPerformanceProps {
  data: any;
  teamPeriod: PeriodValue;
  onTeamPeriodChange: (v: PeriodValue) => void;
}

export default function TeamPerformance({ data, teamPeriod, onTeamPeriodChange }: TeamPerformanceProps) {
  const navigate = useNavigate();

  // Use team data from the stored procedure if available, otherwise show placeholder
  const teamData = React.useMemo(() => {
    const raw: any[] = data?.team || [];
    if (raw.length > 0) {
      return raw.map((agent: any, idx: number) => ({
        name: agent.name || 'Unknown',
        leads: agent.total_leads || 0,
        visits: agent.site_visits || 0,
        bookings: agent.won || 0,
        conversion: agent.total_leads > 0
          ? `${((agent.won || 0) / agent.total_leads * 100).toFixed(1)}%`
          : '0.0%',
        revenue: `₹${((agent.revenue_cr || 0)).toFixed(2)} Cr`,
        sparklineData: [0, agent.won * 0.3, agent.won * 0.6, agent.won],
        img: agent.avatar || TEAM_IMAGES[idx % TEAM_IMAGES.length],
      }));
    }
    // Fallback: static placeholders
    return [
      { name: 'Rahul Sharma', leads: 156, visits: 48, bookings: 12, conversion: '8.3%', revenue: '₹3.24 Cr', sparklineData: [2.5, 2.8, 3.0, 3.24], img: TEAM_IMAGES[0] },
      { name: 'Priya Singh', leads: 142, visits: 42, bookings: 11, conversion: '7.7%', revenue: '₹2.85 Cr', sparklineData: [2.0, 2.2, 2.5, 2.85], img: TEAM_IMAGES[1] },
      { name: 'Amit Verma', leads: 135, visits: 38, bookings: 9, conversion: '6.7%', revenue: '₹2.12 Cr', sparklineData: [1.8, 1.9, 2.0, 2.12], img: TEAM_IMAGES[2] },
    ];
  }, [data?.team]);

  return (
    <div className="dash-card col-span-14">
      <div className="dash-card-hdr">
        <h3 className="dash-card-hdr-title">Team Performance</h3>
        <PeriodSelect
          value={teamPeriod}
          onChange={onTeamPeriodChange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'this_week', label: 'This Week' },
            { value: 'this_month', label: 'This Month' },
            { value: 'last_month', label: 'Last Month' },
            { value: 'this_quarter', label: 'This Quarter' },
            { value: 'this_year', label: 'This Year' },
          ]}
          ariaLabel="Team Performance time period"
        />
      </div>

      <div key={teamPeriod} className="dash-data-fade" style={{ overflowX: 'auto', marginBottom: 8 }}>
        <table className="dash-team-table">
          <thead>
            <tr>
              <th className="dash-team-th">Agent</th>
              <th className="dash-team-th dash-team-th--right">Leads</th>
              <th className="dash-team-th dash-team-th--right">Site Visits</th>
              <th className="dash-team-th dash-team-th--right">Bookings</th>
              <th className="dash-team-th dash-team-th--right">Conversion</th>
              <th className="dash-team-th dash-team-th--right">Revenue (Cr)</th>
              <th className="dash-team-th dash-team-th--center"> </th>
            </tr>
          </thead>
          <tbody>
            {teamData.map((agent, idx) => (
              <tr
                key={idx}
                className="leaderboard-row"
                style={{ borderBottom: idx === teamData.length - 1 ? 'none' : '1px solid #f8fafc' }}
              >
                <td className="dash-team-td dash-team-td--name">
                  <img src={agent.img} alt={agent.name} className="dash-team-avatar" />
                  <span className="dash-team-name">{agent.name}</span>
                </td>
                <td className="dash-team-td dash-team-td--right">{agent.leads}</td>
                <td className="dash-team-td dash-team-td--right">{agent.visits}</td>
                <td className="dash-team-td dash-team-td--right">{agent.bookings}</td>
                <td className="dash-team-td dash-team-td--right dash-team-td--green">{agent.conversion}</td>
                <td className="dash-team-td dash-team-td--right dash-team-td--bold">{agent.revenue}</td>
                <td className="dash-team-td dash-team-td--center">
                  <Sparkline data={agent.sparklineData} color="#10b981" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="dash-team-view-btn" onClick={() => navigate('/leaderboard')}>
        View Full Leaderboard →
      </button>
    </div>
  );
}
