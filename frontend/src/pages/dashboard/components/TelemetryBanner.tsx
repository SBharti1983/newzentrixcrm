import React from 'react';
import { Calendar, Clock, ArrowUpRight, Users, AlertTriangle, ArrowUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TelemetryBannerProps {
  data: any;
}

export default function TelemetryBanner({ data }: TelemetryBannerProps) {
  const navigate = useNavigate();
  const telemetry = data?.telemetry || {};

  const formatRev = (v: any) => {
    if (!v) return '₹0';
    const cr = Number(v) / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(Number(v) / 100000).toFixed(1)} L`;
  };

  const bookingsToday = telemetry.bookings_today ?? 0;
  const siteVisitsToday = telemetry.site_visits_today ?? 0;
  const newLeadsToday = telemetry.new_leads_today ?? 0;
  const dealsNegotiation = telemetry.deals_negotiation ?? 0;
  const revenueRisk = telemetry.revenue_at_risk ?? 0;

  return (
    <div className="dash-telemetry-banner">
      {/* Card 1: Today's Bookings */}
      <div className="dash-telemetry-cell" onClick={() => navigate('/bookings')} style={{ cursor: 'pointer' }}>
        <div className="dash-telemetry-icon" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Calendar size={20} color="#2563eb" />
        </div>
        <div className="dash-telemetry-info">
          <span className="dash-telemetry-label" style={{ color: '#2563eb' }}>Today's Bookings</span>
          <span className="dash-telemetry-value">{bookingsToday}</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>Live <span className="dash-telemetry-trend-muted">updates today</span></span>
          </div>
        </div>
      </div>

      {/* Card 2: Site Visits */}
      <div className="dash-telemetry-cell" onClick={() => navigate('/site-visits')} style={{ cursor: 'pointer' }}>
        <div className="dash-telemetry-icon" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <Clock size={20} color="#7c3aed" />
        </div>
        <div className="dash-telemetry-info">
          <span className="dash-telemetry-label" style={{ color: '#4f46e5' }}>Site Visits</span>
          <span className="dash-telemetry-value">{siteVisitsToday}</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>Today <span className="dash-telemetry-trend-muted">scheduled</span></span>
          </div>
        </div>
      </div>

      {/* Card 3: New Leads */}
      <div className="dash-telemetry-cell" onClick={() => navigate('/leads')} style={{ cursor: 'pointer' }}>
        <div className="dash-telemetry-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
          <ArrowUpRight size={20} color="#059669" />
        </div>
        <div className="dash-telemetry-info">
          <span className="dash-telemetry-label" style={{ color: '#2563eb' }}>New Leads</span>
          <span className="dash-telemetry-value">{newLeadsToday}</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>Today <span className="dash-telemetry-trend-muted">incoming</span></span>
          </div>
        </div>
      </div>

      {/* Card 4: Deals in Negotiation */}
      <div className="dash-telemetry-cell" onClick={() => navigate('/pipeline')} style={{ cursor: 'pointer' }}>
        <div className="dash-telemetry-icon" style={{ background: '#fdf2f8', border: '1px solid #fbcfe8' }}>
          <Users size={20} color="#db2777" />
        </div>
        <div className="dash-telemetry-info">
          <span className="dash-telemetry-label" style={{ color: '#4f46e5' }}>Deals in Negotiation</span>
          <span className="dash-telemetry-value">{dealsNegotiation}</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>Active <span className="dash-telemetry-trend-muted">pipeline</span></span>
          </div>
        </div>
      </div>

      {/* Card 5: Revenue at Risk */}
      <div className="dash-telemetry-risk" onClick={() => navigate('/pipeline')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="dash-telemetry-icon" style={{ background: '#ffedd5', border: '1px solid #fed7aa' }}>
            <AlertTriangle size={20} color="#ea580c" />
          </div>
          <div className="dash-telemetry-info">
            <span className="dash-telemetry-label" style={{ color: '#475569' }}>Revenue at Risk</span>
            <span className="dash-telemetry-value" style={{ color: '#dc2626' }}>{formatRev(revenueRisk)}</span>
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 850 }}>Overdue Payments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
