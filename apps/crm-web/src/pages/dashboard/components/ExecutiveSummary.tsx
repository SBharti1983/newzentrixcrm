import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Briefcase, CheckSquare, ArrowRight, Sparkles } from 'lucide-react';

interface ExecutiveSummaryProps {
  data: any;
  isMobile: boolean;
}

export default function ExecutiveSummary({ data, isMobile }: ExecutiveSummaryProps) {
  const [showAllInsights, setShowAllInsights] = useState(false);

  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  const activeLeads = data?.leads?.active_leads ?? 0;
  const overdueCount = data?.overdue?.overdue_count ?? 0;
  const revenueRisk = data?.telemetry?.revenue_at_risk ?? 0;
  
  // Calculate dynamic likely bookings
  const likelyBookings = Math.max(1, Math.round((data?.bookings?.total || 0) * 0.1));

  const alerts = data?.alerts || [];

  return (
    <div className="dash-card dash-exec-summary">
      <div className="dash-exec-row">
        {/* Header */}
        <div className="dash-exec-header">
          <span className="dash-exec-title">Executive Summary</span>
          <span className="dash-exec-subtitle">Key insights &amp; actions</span>
        </div>

        {/* Items list */}
        <div className="dash-exec-items">
          {/* Item 1 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <AlertTriangle size={16} color="#ea580c" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">{activeLeads}</span>
              <span className="dash-exec-item-label">Active Leads<br />in pipeline</span>
            </div>
          </div>

          {/* Item 2 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <TrendingUp size={16} color="#059669" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">{likelyBookings}</span>
              <span className="dash-exec-item-label">Bookings projected<br />this month</span>
            </div>
          </div>

          {/* Item 3 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#fef2f2', border: '1px solid #fecdd3' }}>
              <Briefcase size={16} color="#dc2626" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">{formatRev(revenueRisk)}</span>
              <span className="dash-exec-item-label">Revenue at risk from<br />overdue accounts</span>
            </div>
          </div>

          {/* Item 4 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <CheckSquare size={16} color="#2563eb" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">{overdueCount}</span>
              <span className="dash-exec-item-label">Overdue milestones<br />pending</span>
            </div>
          </div>

          {/* View All Insights Button */}
          <button
            onClick={() => setShowAllInsights(!showAllInsights)}
            className="dash-exec-view-btn"
          >
            {showAllInsights ? 'Hide Details' : 'View All Insights'}
            <ArrowRight size={14} style={{ transform: showAllInsights ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>

      {/* Expandable Critical Alerts & Insights Panel */}
      {showAllInsights && (
        <div className="dash-data-fade dash-alerts-panel">
          {/* Critical Alerts Block */}
          <div className="dash-alert-block">
            <div className="dash-alert-title">
              <AlertTriangle size={18} color="#ef4444" />
              <span className="dash-alert-title-text">Critical Alerts</span>
            </div>
            <div className="dash-alert-list">
              {alerts.length > 0 ? (
                alerts.map((alert: any, i: number) => (
                  <div className="dash-alert-item" key={alert.id || i}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span><strong>{alert.lead_name}</strong>: {alert.note || 'Cold interaction sentiment detected'}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="dash-alert-item">
                    <CheckSquare size={14} color="#10b981" />
                    <span>No critical cold interaction friction alerts today.</span>
                  </div>
                </>
              )}
              {overdueCount > 0 && (
                <div className="dash-alert-item">
                  <AlertTriangle size={14} color="#f97316" />
                  <span>{overdueCount} Milestones are currently Overdue for collection.</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Action Plan Suggestions */}
          <div className="dash-ai-actions-block">
            <div>
              <div className="dash-ai-actions-title">
                <Sparkles size={16} color="#8b5cf6" />
                <span className="dash-ai-actions-title-text">AI Recommended Actions</span>
              </div>
              <p className="dash-ai-actions-desc">
                {alerts.length > 0 ? (
                  `• Address the ${alerts.length} high-friction interactions immediately. Re-assign or schedule urgent followups.\n`
                ) : ''}
                {overdueCount > 0 ? (
                  `• Follow up with accounts for the ${overdueCount} overdue milestones to maintain healthy project cashflow.\n`
                ) : ''}
                • All systems running clean. Good day to check on won leads and ask for referrals.
              </p>
            </div>
            <button className="dash-ai-resolve-btn" style={{ whiteSpace: 'nowrap' }}>Resolve Inactive Leads</button>
          </div>
        </div>
      )}
    </div>
  );
}
