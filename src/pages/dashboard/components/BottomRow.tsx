import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue, TaskItem } from './shared/types';

interface BottomRowProps {
  tasksList: TaskItem[];
}

export default function BottomRow({ tasksList }: BottomRowProps) {
  const navigate = useNavigate();
  const [targetPeriod, setTargetPeriod] = useState<PeriodValue>('this_month');

  const targetDataMap = useMemo(() => ({
    today: { target: 0.15, achieved: 0.08, remaining: 0.07, percentage: 53 },
    this_week: { target: 1.2, achieved: 0.72, remaining: 0.48, percentage: 60 },
    this_month: { target: 8.5, achieved: 6.4, remaining: 2.1, percentage: 75 },
    this_year: { target: 100, achieved: 78.5, remaining: 21.5, percentage: 78 },
  }), []);

  const targetDataCalculated = targetDataMap[targetPeriod as keyof typeof targetDataMap] || targetDataMap.this_month;

  const radialTargetData = useMemo(() => [
    { value: targetDataCalculated.percentage },
    { value: 100 - targetDataCalculated.percentage },
  ], [targetDataCalculated.percentage]);

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
              <div className="dash-target-stat-value">₹{targetDataCalculated.target} Cr</div>
            </div>
            <div>
              <div className="dash-target-stat-label">Achieved</div>
              <div className="dash-target-stat-value dash-target-stat-value--green">₹{targetDataCalculated.achieved} Cr</div>
            </div>
            <div>
              <div className="dash-target-stat-label">Remaining</div>
              <div className="dash-target-stat-value dash-target-stat-value--red">₹{targetDataCalculated.remaining} Cr</div>
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
              Site visits from <br />Google Ads convert
            </div>
            <div className="dash-ai-rec-big-num">
              42% <span className="dash-ai-rec-big-suffix">higher.</span>
            </div>
            <div className="dash-ai-rec-desc">
              Increase budget by 15% <br />to get more qualified leads.
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
