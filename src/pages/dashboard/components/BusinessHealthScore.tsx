import React from 'react';
import { ShieldCheck, CheckCircle2, ChevronDown } from 'lucide-react';

export default function BusinessHealthScore() {
  const healthItems = [
    { name: 'Revenue Health', status: 'Good' },
    { name: 'Lead Health', status: 'Excellent' },
    { name: 'Team Performance', status: 'Good' },
    { name: 'Conversion Health', status: 'Good' },
  ];

  return (
    <div className="dash-card col-span-12" style={{ padding: 24 }}>
      <div className="dash-card-hdr" style={{ marginBottom: 20 }}>
        <div className="dash-card-hdr-left">
          <ShieldCheck size={18} color="#10b981" />
          <h3 className="dash-card-hdr-title">Business Health Score</h3>
        </div>
      </div>

      <div className="dash-health-top">
        <div className="dash-health-gauge-wrap">
          <div className="dash-health-gauge">
            <svg width="70" height="70" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke="url(#healthGrad)" strokeWidth="3.2"
                strokeDasharray="100" strokeDashoffset="14"
                strokeLinecap="round" transform="rotate(-90 18 18)"
              />
              <defs>
                <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <span className="dash-health-gauge-label">86%</span>
          </div>
          <div>
            <div className="dash-health-status">Excellent</div>
            <ChevronDown size={14} color="#64748b" style={{ marginTop: 2, cursor: 'pointer' }} />
          </div>
        </div>

        <div style={{ width: 120, height: 40 }}>
          <svg width="120" height="40" viewBox="0 0 120 40">
            <path d="M0,32 Q15,28 30,26 T60,18 T90,13 T120,4" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M0,32 Q15,28 30,26 T60,18 T90,13 T120,4 L120,40 L0,40 Z" fill="url(#trendFill)" />
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#d1fae5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="dash-health-list">
        {healthItems.map((item, idx) => (
          <div key={idx} className="dash-health-item">
            <div className="dash-health-item-name">
              <CheckCircle2 size={14} color="#10b981" />
              <span>{item.name}</span>
            </div>
            <span className="dash-health-item-status">{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
