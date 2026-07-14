import React from 'react';
import { MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sparkline from './shared/Sparkline';
import { KPIItem } from './shared/types';

interface KPIGridProps {
  kpis: KPIItem[];
}

export default function KPIGrid({ kpis }: KPIGridProps) {
  const navigate = useNavigate();

  return (
    <div className="dash-grid-6-kpi">
      {kpis.map((k, i) => (
        <div
          key={i}
          className={`enterprise-kpi-card${k.navigateTo ? ' dash-kpi-clickable' : ''}`}
          onClick={k.navigateTo ? () => navigate(k.navigateTo!) : undefined}
          role={k.navigateTo ? 'button' : undefined}
          tabIndex={k.navigateTo ? 0 : undefined}
          onKeyDown={k.navigateTo ? (e) => { if (e.key === 'Enter') navigate(k.navigateTo!); } : undefined}
        >
          <div>
            <div className="dash-kpi-top">
              <div className="dash-kpi-icon" style={{ background: k.iconBg }}>
                {k.icon}
              </div>
              <button className="dash-kpi-more-btn" aria-label="More options">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="dash-kpi-label">{k.label}</div>
          </div>
          <div>
            <div className="dash-kpi-value">{k.val}</div>
            <div className="dash-kpi-bottom">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div className={`dash-kpi-change ${k.isUp ? 'dash-kpi-change--up' : 'dash-kpi-change--down'}`}>
                  {k.isUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  <span>{k.change}</span>
                </div>
                <span className="dash-kpi-vs">vs last month</span>
              </div>
              <Sparkline data={k.sparklineData} color={k.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
