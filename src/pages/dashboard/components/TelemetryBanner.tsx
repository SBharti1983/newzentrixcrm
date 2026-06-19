import React from 'react';
import { Calendar, Clock, ArrowUpRight, Users, AlertTriangle, ArrowUp, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TelemetryBanner() {
  const navigate = useNavigate();

  return (
    <div className="dash-telemetry-banner">
      {/* Card 1: Today's Bookings */}
      <div className="dash-telemetry-cell" onClick={() => navigate('/bookings')} style={{ cursor: 'pointer' }}>
        <div className="dash-telemetry-icon" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Calendar size={20} color="#2563eb" />
        </div>
        <div className="dash-telemetry-info">
          <span className="dash-telemetry-label" style={{ color: '#2563eb' }}>Today's Bookings</span>
          <span className="dash-telemetry-value">12</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>8.3% <span className="dash-telemetry-trend-muted">vs yesterday</span></span>
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
          <span className="dash-telemetry-value">28</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>12.5% <span className="dash-telemetry-trend-muted">vs yesterday</span></span>
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
          <span className="dash-telemetry-value">156</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>10.2% <span className="dash-telemetry-trend-muted">vs yesterday</span></span>
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
          <span className="dash-telemetry-value">47</span>
          <div className="dash-telemetry-trend">
            <ArrowUp size={11} strokeWidth={3} />
            <span>6.8% <span className="dash-telemetry-trend-muted">vs yesterday</span></span>
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
            <span className="dash-telemetry-value" style={{ color: '#dc2626' }}>₹18.6 Cr</span>
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 850 }}>High Priority</span>
          </div>
        </div>
      </div>
    </div>
  );
}
