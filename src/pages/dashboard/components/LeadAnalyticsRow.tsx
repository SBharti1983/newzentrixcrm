import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CustomPieTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { LeadDataItem, PeriodValue } from './shared/types';

interface LeadAnalyticsRowProps {
  leadSourceData: LeadDataItem[];
  leadAgingData: LeadDataItem[];
  leadRiskData: LeadDataItem[];
}

export default function LeadAnalyticsRow({
  leadSourceData,
  leadAgingData,
  leadRiskData,
}: LeadAnalyticsRowProps) {
  const [leadRiskPeriod, setLeadRiskPeriod] = useState<PeriodValue>('all_leads');

  return (
    <div className="dash-row-grid">
      {/* Lead Source Analytics */}
      <div className="dash-card col-span-8">
        <div className="dash-card-hdr">
          <h3 className="dash-card-hdr-title">Lead Source Analytics</h3>
          <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          <div style={{ height: 110, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie data={leadSourceData} cx="50%" cy="50%" innerRadius={38} outerRadius={52} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="dash-lead-donut-legend">
            {leadSourceData.map((source, idx) => (
              <div key={idx} className="dash-lead-donut-row">
                <div className="dash-lead-donut-name">
                  <span className="dash-lead-donut-dot" style={{ background: source.color }} />
                  <span>{source.name}</span>
                </div>
                <div className="dash-lead-donut-val">
                  {source.value}% <span className="dash-lead-donut-count">({source.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Aging */}
      <div className="dash-card col-span-8">
        <div className="dash-card-hdr">
          <h3 className="dash-card-hdr-title">Lead Aging</h3>
          <ChevronDown size={14} style={{ color: '#64748b', cursor: 'pointer' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          <div style={{ position: 'relative', height: 110, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie data={leadAgingData} cx="50%" cy="50%" innerRadius={38} outerRadius={52} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {leadAgingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-donut-center">
              <div className="dash-donut-center-val">2,847</div>
              <div className="dash-donut-center-label">Total Leads</div>
            </div>
          </div>
          <div className="dash-lead-donut-legend">
            {leadAgingData.map((aging, idx) => (
              <div key={idx} className="dash-lead-donut-row">
                <div className="dash-lead-donut-name">
                  <span className="dash-lead-donut-dot" style={{ background: aging.color }} />
                  <span>{aging.name}</span>
                </div>
                <div className="dash-lead-donut-val">
                  {aging.value}% <span className="dash-lead-donut-count">({aging.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lead Risk Overview */}
      <div className="dash-card col-span-8">
        <div className="dash-card-hdr">
          <h3 className="dash-card-hdr-title">Lead Risk Overview</h3>
          <PeriodSelect
            value={leadRiskPeriod}
            onChange={setLeadRiskPeriod}
            options={[
              { value: 'all_leads', label: 'All Leads' },
              { value: 'hot_leads', label: 'Hot Leads' },
            ]}
            ariaLabel="Lead Risk Overview filter"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', height: 100, width: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie data={leadRiskData} cx="50%" cy="50%" innerRadius={34} outerRadius={46} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                    {leadRiskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut-center">
                <div className="dash-donut-center-val">47</div>
                <div className="dash-donut-center-label" style={{ fontSize: '0.52rem' }}>At Risk</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {leadRiskData.map((risk, idx) => (
                <div key={idx} className="dash-lead-donut-row">
                  <div className="dash-lead-donut-name">
                    <span className="dash-lead-donut-dot" style={{ background: risk.color }} />
                    <span>{risk.name}</span>
                  </div>
                  <div className="dash-lead-donut-val" style={{ fontWeight: 850 }}>
                    {risk.value} <span className="dash-lead-donut-count">({risk.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-risk-footer">
            <div className="dash-risk-footer-label">Potential Revenue Risk</div>
            <div className="dash-risk-footer-value">₹26.5 Lakh</div>
          </div>
        </div>
      </div>
    </div>
  );
}
