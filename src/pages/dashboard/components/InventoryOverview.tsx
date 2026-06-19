import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CustomInventoryTooltip } from './shared/CustomTooltips';
import { useNavigate } from 'react-router-dom';
import { InventoryItem, DashCardProps } from './shared/types';

interface InventoryOverviewProps extends DashCardProps {
  inventoryChartData: InventoryItem[];
}

export default function InventoryOverview({ isMobile, inventoryChartData }: InventoryOverviewProps) {
  const navigate = useNavigate();

  return (
    <div className="dash-row-grid">
      <div className="dash-card col-span-24" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
        <div className="dash-card-hdr">
          <h3 className="dash-card-hdr-title">Inventory Overview</h3>
          <div className="dash-inventory-legend">
            <div className="dash-inventory-legend-item">
              <span className="dash-inventory-legend-dot" style={{ background: '#10b981' }} />
              <span>Sold</span>
            </div>
            <div className="dash-inventory-legend-item">
              <span className="dash-inventory-legend-dot" style={{ background: '#3b82f6' }} />
              <span>Available</span>
            </div>
            <div className="dash-inventory-legend-item">
              <span className="dash-inventory-legend-dot" style={{ background: '#f59e0b' }} />
              <span>Hold</span>
            </div>
          </div>
        </div>

        <div className={isMobile ? '' : 'dash-inventory-grid'}>
          {/* KPI statistics block */}
          <div className="dash-inventory-kpi-grid">
            <div className="dash-inventory-kpi">
              <div className="dash-inventory-kpi-label">Total Units</div>
              <div className="dash-inventory-kpi-value">3,128</div>
            </div>
            <div className="dash-inventory-kpi">
              <div className="dash-inventory-kpi-header">
                <span className="dash-inventory-kpi-label" style={{ flex: 1 }}>Available Units</span>
                <span className="dash-inventory-kpi-badge dash-inventory-kpi-badge--green">46.6%</span>
              </div>
              <div className="dash-inventory-kpi-value">1,456</div>
            </div>
            <div className="dash-inventory-kpi">
              <div className="dash-inventory-kpi-label">Sold Units</div>
              <div className="dash-inventory-kpi-value">1,672</div>
            </div>
            <div className="dash-inventory-kpi">
              <div className="dash-inventory-kpi-header">
                <span className="dash-inventory-kpi-label" style={{ flex: 1 }}>Hold Units</span>
                <span className="dash-inventory-kpi-badge dash-inventory-kpi-badge--red">3.1%</span>
              </div>
              <div className="dash-inventory-kpi-value">96</div>
            </div>
          </div>

          {/* Stacked grouped bar chart */}
          <div className="dash-inventory-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryChartData} margin={{ top: 10, right: 10, left: -26, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fill: '#94a3b8', fontSize: 7, fontWeight: 700, angle: -12, textAnchor: 'end' } as any} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} />
                <Tooltip content={<CustomInventoryTooltip />} />
                <Bar dataKey="sold" stackId="invStack" fill="#10b981" barSize={14} radius={[0, 0, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="available" stackId="invStack" fill="#3b82f6" barSize={14} isAnimationActive={false} />
                <Bar dataKey="hold" stackId="invStack" fill="#f59e0b" barSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
