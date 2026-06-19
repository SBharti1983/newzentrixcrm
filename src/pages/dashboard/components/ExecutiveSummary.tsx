import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Briefcase, CheckSquare, ArrowRight, Sparkles } from 'lucide-react';
import { DashCardProps } from './shared/types';

export default function ExecutiveSummary({ isMobile }: DashCardProps) {
  const [showAllInsights, setShowAllInsights] = useState(false);

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
              <span className="dash-exec-item-value">23</span>
              <span className="dash-exec-item-label">Leads inactive for<br />7+ days</span>
            </div>
          </div>

          {/* Item 2 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <TrendingUp size={16} color="#059669" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">12</span>
              <span className="dash-exec-item-label">Bookings likely<br />this week</span>
            </div>
          </div>

          {/* Item 3 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#fef2f2', border: '1px solid #fecdd3' }}>
              <Briefcase size={16} color="#dc2626" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">₹18.6 Cr</span>
              <span className="dash-exec-item-label">Revenue at risk from<br />delayed deals</span>
            </div>
          </div>

          {/* Item 4 */}
          <div className="dash-exec-item">
            <div className="dash-exec-icon" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <CheckSquare size={16} color="#2563eb" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="dash-exec-item-value">3</span>
              <span className="dash-exec-item-label">Approvals<br />pending</span>
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
              <div className="dash-alert-item">
                <AlertTriangle size={14} color="#f97316" />
                <span>23 Leads inactive &gt; 7 days</span>
              </div>
              <div className="dash-alert-item">
                <AlertTriangle size={14} color="#f97316" />
                <span>12 Deals at risk of closing</span>
              </div>
              <div className="dash-alert-item">
                <AlertTriangle size={14} color="#f97316" />
                <span>3 High value approvals pending</span>
              </div>
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
                • Re-assign the **23 inactive leads** to active agents to prevent drop-offs.<br />
                • Follow up with client accounts for the **3 pending approvals** immediately to close Q2 targets.
              </p>
            </div>
            <button className="dash-ai-resolve-btn">Auto-resolve Inactive Leads</button>
          </div>
        </div>
      )}
    </div>
  );
}
