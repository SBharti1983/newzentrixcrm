import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color: string;
}

const Sparkline = React.memo(({ data, color }: SparklineProps) => {
  const chartData = data.map((val, idx) => ({ id: idx, val }));
  return (
    <div className="dash-sparkline-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`glow-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#glow-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

Sparkline.displayName = 'Sparkline';
export default Sparkline;
