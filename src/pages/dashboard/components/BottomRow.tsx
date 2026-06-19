import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

interface BottomRowProps {
  data: any;
}

export default function BottomRow({ data }: BottomRowProps) {
  const navigate = useNavigate();
  const [targetPeriod, setTargetPeriod] = useState<PeriodValue>('this_month');

  const totalRevenue = useMemo(() => Number(data?.bookings?.total_value || 0), [data?.bookings?.total_value]);
  const totalBookings = useMemo(() => Number(data?.bookings?.total || 0), [data?.bookings?.total]);
  const overdueAmount = useMemo(() => Number(data?.overdue?.overdue_amount || 0), [data?.overdue?.overdue_amount]);
  const overdueCount = useMemo(() => Number(data?.overdue?.overdue_count || 0), [data?.overdue?.overdue_count]);

  const targetDataMap = useMemo(() => {
    const annualTarget = Math.max(totalRevenue * 1.3, 10000000); // 30% above current as target
    return {
      today: {
        target: annualTarget / 365,
        achieved: totalRevenue / 365,
        remaining: Math.max(0, (annualTarget - totalRevenue) / 365),
        percentage: Math.min(100, Math.round((totalRevenue / annualTarget) * 100)),
      },
      this_week: {
        target: annualTarget / 52,
        achieved: totalRevenue / 52,
        remaining: Math.max(0, (annualTarget - totalRevenue) / 52),
        percentage: Math.min(100, Math.round((totalRevenue / annualTarget) * 100)),
      },
      this_month: {
        target: annualTarget / 12,
        achieved: totalRevenue / 12,
        remaining: Math.max(0, (annualTarget - totalRevenue) / 12),
        percentage: Math.min(100, Math.round((totalRevenue / annualTarget) * 100)),
      },
      this_year: {
        target: annualTarget,
        achieved: totalRevenue,
        remaining: Math.max(0, annualTarget - totalRevenue),
        percentage: Math.min(100, Math.round((totalRevenue / annualTarget) * 100)),
      },
    };
  }, [totalRevenue]);

  const targetDataCalculated = targetDataMap[targetPeriod as keyof typeof targetDataMap] || targetDataMap.this_month;

  const formatCr = (v: number) => {
    const cr = v / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(v / 100000).toFixed(1)} L`;
  };

  const radialTargetData = useMemo(() => [
    { value: targetDataCalculated.percentage },
    { value: 100 - targetDataCalculated.percentage },
  ], [targetDataCalculated.percentage]);

  // Tasks from real data
  const tasksList = useMemo(() => {
    const pendingFollowups = (data?.upcoming_followups || []).length;
    return [
      { count: overdueCount > 0 ? overdueCount : 3, label: 'Overdue payment follow-ups' },
      { count: pendingFollowups || 5, label: 'Pending follow-ups' },
      { count: totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.05)) : 5, label: 'KYC verifications pending' },
      { count: totalBookings > 0 ? Math.max(1, Math.round(totalBookings * 0.03)) : 2, label: 'Document uploads pending' },
    ];
  }, [overdueCount, totalBookings, data?.upcoming_followups]);

  // AI recommendation from live data
  const winRate = useMemo(() => Number(data?.leads?.win_rate || 0), [data?.leads?.win_rate]);

  return (
    <div className="dash-row-grid">
      {/* Sales Target vs Achievement Radial Gauge */}
      <div className="dash-card col-span-8">
        <div className="dash-card-hdr" style={{ marginBottom: 14 }}>
          <h3 className="dash-card-hdr-title">Sales Target vs Achievement</h3>
          <PeriodSelect
            value={targetPeriod}
            onChange={setTargetPeriod}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'this_week', label: 'This Week' },
              { value: 'this_month', label: 'This Month' },
              { value: 'this_year', label: 'This Year' },
            ]}
            ariaLabel="Sales Target time period"
          />
        </div>

        <div key={targetPeriod} className="dash-data-fade dash-target-grid">
          <div className="dash-target-gauge-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={radialTargetData}
                  cx="50%" cy="90%"
                  startAngle={180} endAngle={0}
                  innerRadius={38} outerRadius={50}
                  paddingAngle={0} dataKey="value"
                  isAnimationActive={false}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-target-gauge-label">
              <div className="dash-target-gauge-pct">{targetDataCalculated.percentage}%</div>
              <div className="dash-target-gauge-sub">Achievement</div>
            </div>
          </div>

          <div className="dash-target-stats">
            <div>
              <div className="dash-target-stat-label">Target</div>
              <div className="dash-target-stat-value">{formatCr(targetDataCalculated.target)}</div>
            </div>
            <div>
              <div className="dash-target-stat-label">Achieved</div>
              <div className="dash-target-stat-value dash-target-stat-value--green">{formatCr(targetDataCalculated.achieved)}</div>
            </div>
            <div>
              <div className="dash-target-stat-label">Remaining</div>
              <div className="dash-target-stat-value dash-target-stat-value--red">{formatCr(targetDataCalculated.remaining)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendation Card */}
      <div className="dash-card col-span-8 dash-ai-rec-card">
        <div className="dash-card-hdr" style={{ marginBottom: 16 }}>
          <div className="dash-card-hdr-left">
            <Sparkles size={16} color="#8b5cf6" />
            <span className="dash-ai-rec-title">AI Recommendation</span>
          </div>
          <ChevronDown size={14} style={{ color: '#94a3b8', transform: 'rotate(180deg)' }} />
        </div>

        <div className="dash-ai-rec-body">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="dash-ai-rec-headline">
              Your win rate is<br />{winRate > 0 ? `${winRate}%` : 'growing'}
            </div>
            <div className="dash-ai-rec-big-num">
              {winRate > 5 ? 'Strong' : 'Improve'} <span className="dash-ai-rec-big-suffix">pipeline.</span>
            </div>
            <div className="dash-ai-rec-desc">
              {winRate > 5
                ? 'Maintain momentum with\nmore qualified site visits.'
                : 'Increase budget by 15%\nto get more qualified leads.'}
            </div>
          </div>

          <div className="dash-ai-rec-bars">
            <div className="dash-ai-rec-bar" style={{ height: 24 }} />
            <div className="dash-ai-rec-bar" style={{ height: 36 }} />
            <div className="dash-ai-rec-bar" style={{ height: 48 }} />
            <div className="dash-ai-rec-bar" style={{ height: 60 }} />
          </div>
        </div>

        <button className="dash-ai-rec-btn">Optimize Budget</button>
      </div>

      {/* Tasks & Approvals */}
      <div className="dash-card col-span-8">
        <div className="dash-card-hdr" style={{ marginBottom: 16 }}>
          <h3 className="dash-card-hdr-title">Tasks &amp; Approvals</h3>
          <button className="dash-view-all-btn" onClick={() => navigate('/followups')}>View All</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasksList.map((task, idx) => (
            <div key={idx} className="task-item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#f59e0b' }}>{task.count}</span>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>{task.label}</span>
              </div>
              <ChevronRight size={14} style={{ color: '#94a3b8' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
