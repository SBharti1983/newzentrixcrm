import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUp } from 'lucide-react';
import PeriodSelect from './shared/PeriodSelect';
import { PeriodValue } from './shared/types';

interface BookingTrendProps {
  data: any;
  bookingPeriod: PeriodValue;
  onBookingPeriodChange: (v: PeriodValue) => void;
}

export default function BookingTrend({ data, bookingPeriod, onBookingPeriodChange }: BookingTrendProps) {
  const bookingTrendData = useMemo(() => {
    const raw: any[] = data?.booking_trends || [];
    if (!raw.length) return [];
    return raw.map((r: any) => ({
      name: r.name || '',
      bookings: Number(r.bookings) || 0,
    }));
  }, [data?.booking_trends]);

  const totalBookings = useMemo(() => {
    return bookingTrendData.reduce((sum, d) => sum + d.bookings, 0);
  }, [bookingTrendData]);

  return (
    <div className="dash-card col-span-12">
      <div className="dash-card-hdr" style={{ marginBottom: 14 }}>
        <h3 className="dash-card-hdr-title">Booking Trend</h3>
        <PeriodSelect
          value={bookingPeriod}
          onChange={onBookingPeriodChange}
          options={[
            { value: 'this_year', label: 'This Year' },
            { value: 'this_month', label: 'This Month' },
          ]}
          ariaLabel="Booking Trend time period"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div className="dash-booking-header">
          <div>
            <div className="dash-booking-value">{totalBookings}</div>
            <div className="dash-booking-sub">Total Bookings</div>
          </div>
          <div className="dash-booking-badge">
            <ArrowUp size={12} />
            <span>YTD <span style={{ color: '#059669', fontWeight: 600 }}>bookings</span></span>
          </div>
        </div>

        <div className="dash-booking-chart">
          {bookingTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingTrendData} margin={{ top: 5, right: 10, left: -26, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                <Bar dataKey="bookings" fill="#3b82f6" barSize={12} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>No booking trend data</div>
          )}
        </div>
      </div>
    </div>
  );
}
