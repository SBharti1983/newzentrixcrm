import React from 'react';

interface FunnelSegmentProps {
  label: string;
  count: number;
  percentage?: string;
  color: string;
  clipPath: string;
  width: string;
}

const FunnelSegment = React.memo(({ label, count, percentage, color, clipPath, width }: FunnelSegmentProps) => {
  return (
    <div className="dash-funnel-row">
      <div className="dash-funnel-bar-wrap">
        <div
          className="dash-funnel-bar"
          style={{ width, background: color, clipPath }}
        />
      </div>
      <div className="dash-funnel-label">{label}</div>
      <div className="dash-funnel-values">
        <span className="dash-funnel-count">{Number(count).toLocaleString()}</span>
        {percentage ? (
          <span className="dash-funnel-pct">{percentage}</span>
        ) : (
          <span className="dash-funnel-pct-spacer" />
        )}
      </div>
    </div>
  );
});

FunnelSegment.displayName = 'FunnelSegment';
export default FunnelSegment;
