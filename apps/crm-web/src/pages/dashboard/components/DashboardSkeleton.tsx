import React from 'react';

/**
 * Shimmer loading skeleton that matches the dashboard layout.
 * Displayed while initial data is loading.
 */
export default function DashboardSkeleton() {
  return (
    <div className="dash-premium-container" style={{ padding: '24px 32px' }}>
      {/* KPI Grid Skeleton */}
      <div className="dash-grid-6-kpi" style={{ marginBottom: '24px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dash-skeleton-card">
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 32, height: 32, marginBottom: 12 }} />
            <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--sm" />
            <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--lg" style={{ marginBottom: 16 }} />
            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '50%' }} />
          </div>
        ))}
      </div>

      {/* Telemetry Banner Skeleton */}
      <div className="dash-skeleton-card" style={{ marginBottom: 24, display: 'flex', gap: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, width: '100%' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '20px 24px', borderRight: i < 4 ? '1px solid #e2e8f0' : 'none' }}>
              <div className="dash-skeleton dash-skeleton-circle" style={{ width: 42, height: 42, marginBottom: 10, borderRadius: 12 }} />
              <div className="dash-skeleton dash-skeleton-bar" style={{ width: '70%' }} />
              <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--lg" style={{ width: '50%' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Executive Summary Skeleton */}
      <div className="dash-skeleton-card" style={{ marginBottom: 24 }}>
        <div className="dash-skeleton dash-skeleton-bar" style={{ width: '20%', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="dash-skeleton dash-skeleton-circle" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div style={{ flex: 1 }}>
                <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--lg" />
                <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Command Center + Sidebar Skeleton */}
      <div className="dash-row-grid" style={{ marginBottom: 24 }}>
        <div className="dash-skeleton-card col-span-17">
          <div className="dash-skeleton dash-skeleton-bar" style={{ width: '35%', marginBottom: 20 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--sm" />
                <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--lg" />
              </div>
            ))}
          </div>
          <div className="dash-skeleton dash-skeleton-chart" />
        </div>
        <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="dash-skeleton-card" style={{ minHeight: 120 }}>
            <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--sm" />
            <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--lg" style={{ marginTop: 8 }} />
            <div className="dash-skeleton dash-skeleton-chart" style={{ height: 40 }} />
          </div>
          <div className="dash-skeleton-card" style={{ flex: 1 }}>
            <div className="dash-skeleton dash-skeleton-bar" style={{ width: '50%', marginBottom: 16 }} />
            <div className="dash-skeleton dash-skeleton-circle" style={{ width: 100, height: 100, margin: '0 auto 16px', borderRadius: '50%' }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="dash-skeleton dash-skeleton-bar" style={{ marginBottom: 6 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row Skeleton */}
      <div className="dash-row-grid">
        <div className="dash-skeleton-card col-span-12">
          <div className="dash-skeleton dash-skeleton-bar" style={{ width: '30%', marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div className="dash-skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div className="dash-skeleton dash-skeleton-bar" style={{ width: '60%' }} />
                <div className="dash-skeleton dash-skeleton-bar dash-skeleton-bar--sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="dash-skeleton-card col-span-12">
          <div className="dash-skeleton dash-skeleton-bar" style={{ width: '30%', marginBottom: 16 }} />
          <div className="dash-skeleton dash-skeleton-chart" style={{ height: 160 }} />
        </div>
      </div>
    </div>
  );
}
