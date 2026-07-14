import React from 'react';

// ─── Revenue Trend Tooltip ──────────────────────────────────────────
export const CustomRevenueTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="dash-tooltip">
        <div className="dash-tooltip-title">{data.name} 2024</div>
        <div className="dash-tooltip-row">
          Revenue: <span className="dash-tooltip-val">₹{data.revenue.toFixed(1)} Cr</span>
        </div>
        <div className="dash-tooltip-row">
          Target: <span className="dash-tooltip-val">₹{data.target.toFixed(1)} Cr</span>
        </div>
        <div className="dash-tooltip-row">
          Achievement: <span className="dash-tooltip-val">{Math.floor(data.revenue * 100 / data.target)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Pie/Donut Tooltip ──────────────────────────────────────────────
export const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="dash-tooltip">
        <div className="dash-tooltip-pie-row">
          <span className="dash-tooltip-dot" style={{ background: data.color }} />
          <span className="dash-tooltip-row">{data.name}:</span>
          <span className="dash-tooltip-val">{data.value}%</span>
          <span className="dash-tooltip-muted">({data.count})</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Inventory Stacked Bar Tooltip ──────────────────────────────────
export const CustomInventoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="dash-tooltip dash-tooltip-lg">
        <div className="dash-tooltip-title">{label}</div>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="dash-tooltip-pie-row">
            <span className="dash-tooltip-dot dash-tooltip-dot-sq" style={{ background: p.fill }} />
            <span className="dash-tooltip-row" style={{ textTransform: 'capitalize' }}>{p.name}:</span>
            <span className="dash-tooltip-val">{p.value} Units</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
