import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sparkline from './shared/Sparkline';
import PeriodSelect from './shared/PeriodSelect';
import { TeamMember, PeriodValue } from './shared/types';

interface TeamPerformanceProps {
  teamPeriod: PeriodValue;
  onTeamPeriodChange: (v: PeriodValue) => void;
  teamData: TeamMember[];
}

export default function TeamPerformance({ teamPeriod, onTeamPeriodChange, teamData }: TeamPerformanceProps) {
  const navigate = useNavigate();

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
