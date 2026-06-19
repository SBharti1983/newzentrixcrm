import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CustomPieTooltip } from './shared/CustomTooltips';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

const SOURCE_COLORS = ['#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#f97316'];
const AGING_COLORS: Record<string, string> = {
  '0-7 Days': '#3b82f6',
  '8-15 Days': '#06b6d4',
  '16-30 Days': '#f59e0b',
  '31-60 Days': '#8b5cf6',
  '60+ Days': '#ef4444',
};
const RISK_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
  Hot: '#ef4444',
  Warm: '#f59e0b',
  Cold: '#3b82f6',
};

interface LeadAnalyticsRowProps {
  data: any;
}

export default function LeadAnalyticsRow({ data }: LeadAnalyticsRowProps) {
  const [leadRiskPeriod, setLeadRiskPeriod] = useState<PeriodValue>('all_leads');

  // ── Lead Source Data ──
  const leadSourceData = useMemo(() => {
    const raw: any[] = data?.lead_sources || [];
    if (!raw.length) return [];
    const total = raw.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
    return raw.map((r: any, idx: number) => ({
      name: r.name || 'Unknown',
      value: Math.round((Number(r.count || 0) / total) * 100),
      count: Number(r.count || 0),
      color: SOURCE_COLORS[idx % SOURCE_COLORS.length],
    }));
  }, [data?.lead_sources]);

  // ── Lead Aging Data ──
  const leadAgingData = useMemo(() => {
    const raw: any[] = data?.lead_aging || [];
    if (!raw.length) return [];
    const total = raw.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
    return raw.map((r: any) => ({
      name: r.name || 'Unknown',
      value: Math.round((Number(r.count || 0) / total) * 100),
      count: Number(r.count || 0),
      color: AGING_COLORS[r.name] || '#94a3b8',
    }));
  }, [data?.lead_aging]);

  const totalActiveLeads = useMemo(() => {
    return leadAgingData.reduce((s, d) => s + d.count, 0);
  }, [leadAgingData]);

  // ── Lead Risk Data ──
  const leadRiskData = useMemo(() => {
    const raw: any[] = data?.lead_risk || [];
    if (!raw.length) return [];
    const total = raw.reduce((s, r) => s + Number(r.count || 0), 0) || 1;
    return raw.map((r: any) => ({
      name: `${r.name || 'Unknown'} Risk`,
      value: Number(r.count || 0),
      percentage: `${((Number(r.count || 0) / total) * 100).toFixed(1)}%`,
      color: RISK_COLORS[r.name] || '#94a3b8',
    }));
  }, [data?.lead_risk]);

  const totalAtRisk = useMemo(() => {
    return leadRiskData.reduce((s, d) => s + d.value, 0);
  }, [leadRiskData]);

  const revenueAtRisk = useMemo(() => {
    const val = Number(data?.telemetry?.revenue_at_risk || 0);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    return `₹${(val / 100000).toFixed(1)} Lakh`;
  }, [data?.telemetry?.revenue_at_risk]);

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
            {leadSourceData.length > 0 ? (
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.82rem' }}>No data</div>
            )}
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
            {leadAgingData.length > 0 ? (
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.82rem' }}>No data</div>
            )}
            <div className="dash-donut-center">
              <div className="dash-donut-center-val">{totalActiveLeads.toLocaleString()}</div>
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
              {leadRiskData.length > 0 ? (
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
              ) : null}
              <div className="dash-donut-center">
                <div className="dash-donut-center-val">{totalAtRisk}</div>
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
            <div className="dash-risk-footer-value">{revenueAtRisk}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
