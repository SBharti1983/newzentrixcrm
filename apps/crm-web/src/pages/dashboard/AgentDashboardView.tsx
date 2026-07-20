import React, { useState, useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip,
    PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { 
    Phone, Mail, Calendar, MapPin, CalendarCheck, ChevronDown, 
    Bell, Search, MessageSquare, Flame, TrendingUp, Clock, UserCheck, 
    ChevronRight, Users, LayoutDashboard, Briefcase, Sparkles, GraduationCap, Award, ShieldCheck,
    CheckSquare, FileBarChart, Megaphone, Settings, HelpCircle, Plus, Smartphone, Zap, Trophy, AlertCircle
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import AIDailyBriefing from '../../components/AIDailyBriefing';
import * as dateUtils from '../../utils/dateUtils';

// --- DEMO DATA ---
const YEARLY_TREND = [
  { name: 'Jan', leads: 40, calls: 55, follow: 20, visits: 10, conversions: 4 },
  { name: 'Feb', leads: 45, calls: 60, follow: 25, visits: 15, conversions: 6 },
  { name: 'Mar', leads: 55, calls: 75, follow: 30, visits: 22, conversions: 8 },
  { name: 'Apr', leads: 50, calls: 65, follow: 28, visits: 18, conversions: 7 },
  { name: 'May', leads: 62, calls: 80, follow: 35, visits: 28, conversions: 9 },
  { name: 'Jun', leads: 58, calls: 72, follow: 32, visits: 24, conversions: 8 },
  { name: 'Jul', leads: 65, calls: 85, follow: 38, visits: 30, conversions: 11 },
  { name: 'Aug', leads: 70, calls: 95, follow: 42, visits: 35, conversions: 12 },
  { name: 'Sep', leads: 75, calls: 100, follow: 48, visits: 40, conversions: 14 },
  { name: 'Oct', leads: 82, calls: 110, follow: 55, visits: 45, conversions: 17 },
  { name: 'Nov', leads: 88, calls: 120, follow: 60, visits: 50, conversions: 19 },
  { name: 'Dec', leads: 95, calls: 130, follow: 68, visits: 58, conversions: 22 },
];

const MONTHLY_TREND = [
  { name: 'Apr 1', leads: 20, calls: 30, follow: 10, visits: 5, conversions: 2 },
  { name: 'Apr 6', leads: 35, calls: 45, follow: 15, visits: 10, conversions: 3 },
  { name: 'Apr 12', leads: 50, calls: 65, follow: 25, visits: 20, conversions: 5 },
  { name: 'Apr 18', leads: 40, calls: 50, follow: 18, visits: 15, conversions: 4 },
  { name: 'Apr 24', leads: 62, calls: 80, follow: 35, visits: 28, conversions: 7 },
  { name: 'Apr 27', leads: 42, calls: 58, follow: 33, visits: 24, conversions: 5 },
  { name: 'Apr 30', leads: 70, calls: 90, follow: 45, visits: 35, conversions: 9 },
];

const CONVERSION_DATA = [
    { name: 'Done', value: 10.3 },
    { name: 'Pending', value: 89.7 }
];

const COLORS = {
    blue: '#3b82f6',
    green: '#10b981',
    orange: '#f97316',
    cyan: '#06b6d4',
    slate950: '#0f172a',
    slate900: '#1e293b',
    slate800: '#334155',
    slate700: '#475569',
    slate600: '#64748b',
    slate500: '#94a3b8',
    slate400: '#cbd5e1',
    slate200: '#e2e8f0',
    slate100: '#f1f5f9',
    slate50: '#f8fafc',
    border: '#f1f5f9'
};

// --- SUB-COMPONENTS ---

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ 
                background: '#fff', padding: '16px', borderRadius: '14px', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                border: '1px solid #f1f5f9', minWidth: '150px'
            }}>
                <p style={{ margin: '0 0 10px', fontWeight: 900, fontSize: '0.85rem', color: COLORS.slate950 }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                            <span style={{ fontSize: '0.75rem', color: COLORS.slate700, fontWeight: 700 }}>{entry.name}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate950 }}>{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const KPI = ({ title, value, perc, isUp, icon: Icon, color, sparkData, sparkColor, onClick, loading }: any) => (
    <div 
        onClick={onClick}
        style={{ 
            background: '#fff', 
            borderRadius: '12px', padding: '14px', 
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', gap: '8px',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.2s, box-shadow 0.2s',
            position: 'relative',
            overflow: 'hidden',
            opacity: loading ? 0.7 : 1
        }}
        className={onClick ? 'hover-lift' : ''}
    >
        {loading && (
            <div style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px', 
                background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                animation: 'skeletonPulse 1.5s infinite linear'
            }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate600 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={13} />}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
            <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: COLORS.slate950, lineHeight: 1.1 }}>{value}</div>
                {perc && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <span style={{ 
                            fontSize: '0.65rem', fontWeight: 850, 
                            color: isUp ? COLORS.green : '#ef4444', 
                            background: isUp ? '#d1fae5' : '#fee2e2',
                            padding: '2px 6px', borderRadius: '6px',
                            display: 'inline-flex', alignItems: 'center', gap: '2px'
                        }}>
                            {isUp ? '↑' : '↓'} {perc}
                        </span>
                    </div>
                )}
            </div>
            {sparkData && (
                <div style={{ width: 45, height: 22, marginBottom: '2px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                            <Area type="monotone" dataKey="v" stroke={sparkColor} fill={sparkColor} fillOpacity={0.1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    </div>
);

const PriorityItem = ({ icon: Icon, color, bg, label, count, onClick, isLast, badgeColor = '#e11d48', badgeBg = '#fff1f2' }: any) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '12px 0', 
            cursor: 'pointer',
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`
        }}
        className="hover-lift"
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate700 }}>{label}</span>
        </div>
        <div style={{ 
            minWidth: 28, height: 22, background: badgeBg, color: badgeColor, 
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '0.8rem', fontWeight: 800, padding: '0 8px'
        }}>
            {count}
        </div>
    </div>
);

const TimelineItem = ({ time, timeIcon: TimeIcon, title, sub, badge, badgeColor, badgeBg, img, icon: Icon, isLast, onClick, isAi }: any) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', 
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
            cursor: 'pointer'
        }}
        className="hover-lift"
    >
        <div style={{ width: '64px', flexShrink: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950 }}>{time}</div>
            {TimeIcon && <TimeIcon size={12} style={{ color: COLORS.slate400, marginTop: '2px' }} />}
        </div>
        
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: isAi ? 'rgba(139, 92, 246, 0.1)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: isAi ? '1.5px solid rgba(139, 92, 246, 0.4)' : 'none' }}>
            {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : isAi ? <Sparkles size={16} color="#8b5cf6" /> : <Icon size={14} color={COLORS.blue} />}
        </div>

        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {title} {isAi && <div style={{ fontSize: '0.6rem', color: '#8b5cf6', fontWeight: 900, background: 'rgba(139, 92, 246, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>AI</div>}
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate600, marginTop: '2px' }}>{sub}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
                fontSize: '0.65rem', fontWeight: 800, color: isAi ? '#8b5cf6' : badgeColor, background: isAi ? 'rgba(139, 92, 246, 0.05)' : badgeBg, 
                padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '4px',
                border: isAi ? '1px solid rgba(139, 92, 246, 0.1)' : 'none'
            }}>
                {title.toLowerCase().includes('call') && <Flame size={10} />} {isAi ? 'Smart Task' : badge}
            </span>
            <ChevronRight size={14} color={COLORS.slate400} />
        </div>
    </div>
);

const PROJECT_CARD_COLORS = [
    { bar: '#10b981', bg: 'rgba(16,185,129,0.07)', badge: 'rgba(16,185,129,0.15)', text: '#059669' },
    { bar: '#6366f1', bg: 'rgba(99,102,241,0.07)', badge: 'rgba(99,102,241,0.15)', text: '#4f46e5' },
    { bar: '#f59e0b', bg: 'rgba(245,158,11,0.07)', badge: 'rgba(245,158,11,0.15)', text: '#d97706' },
    { bar: '#06b6d4', bg: 'rgba(6,182,212,0.07)', badge: 'rgba(6,182,212,0.15)', text: '#0891b2' },
    { bar: '#ef4444', bg: 'rgba(239,68,68,0.07)', badge: 'rgba(239,68,68,0.15)', text: '#dc2626' },
];

const formatRevProject = (v: number) => {
    const cr = v / 10000000;
    return cr >= 1 ? `₹${cr.toFixed(1)} Cr` : `₹${(v / 100000).toFixed(1)} L`;
};

const ProjectCard = ({ project, idx }: { project: any; idx: number }) => {
    const c = PROJECT_CARD_COLORS[idx % PROJECT_CARD_COLORS.length];
    const totalUnits = Number(project.total_units) || 0;
    const availableUnits = Number(project.available_units) || 0;
    const soldUnits = totalUnits > 0 ? totalUnits - availableUnits : Number(project.bookings_count) || 0;
    const soldPct = totalUnits > 0 ? Math.round((soldUnits / totalUnits) * 100) : Number(project.sold_pct) || 0;
    const revenue = formatRevProject(Number(project.total_value) || 0);
    return (
        <div style={{
            background: c.bg, borderRadius: '12px',
            border: `1px solid ${c.bar}33`,
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        className="hover-lift"
        >
            {/* Row 1: Rank Badge + Name & Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <span style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: c.bar, color: '#fff',
                    fontSize: '0.62rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{idx + 1}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                    </div>
                    {project.location && (
                        <div style={{ fontSize: '0.63rem', color: '#64748b', fontWeight: 700 }}>{project.location}</div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: `${c.bar}15`, width: '100%' }} />

            {/* Row 2: Metrics Grid */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
                {/* Stats Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {[
                        { val: totalUnits || soldUnits, label: 'Units', color: '#0f172a' },
                        { val: soldUnits, label: 'Sold', color: c.text },
                        { val: Number(project.bookings_count) || 0, label: 'Bookings', color: '#0f172a' },
                    ].map((stat, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <div style={{ width: '1px', background: `${c.bar}25`, height: '18px' }} />}
                            <div style={{ textAlign: 'center', minWidth: '32px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.val}</div>
                                <div style={{ fontSize: '0.54rem', color: '#64748b', fontWeight: 800, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{stat.label}</div>
                            </div>
                        </React.Fragment>
                    ))}
                </div>

                {/* Sold Progress Bar */}
                <div style={{ flex: 1, minWidth: '70px', maxWidth: '100px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.54rem', color: '#64748b', fontWeight: 800 }}>Sold</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: c.text }}>{soldPct}%</span>
                    </div>
                    <div style={{ height: '4px', background: `${c.bar}15`, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${soldPct}%`, height: '100%', background: c.bar, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                    </div>
                </div>

                {/* Revenue Badge */}
                <span style={{ background: c.badge, color: c.text, fontSize: '0.62rem', fontWeight: 900, borderRadius: '6px', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                    {revenue}
                </span>
            </div>
        </div>
    );
};


const LeadListItem = ({ name, type, time, info, details, img, isAvatar, onClick, isLast }: any) => (
    <div 
        onClick={onClick}
        style={{ 
            display: 'flex', gap: '14px', padding: '14px 0', 
            borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
            cursor: 'pointer'
        }}
        className="hover-lift"
    >
        <div style={{ width: 70, height: 70, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: `hsl(${(String(name || '#')).charCodeAt(0) * 47 % 360}, 60%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {img ? <img src={img} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name?.charAt(0)?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {type === 'Hot' && <Flame size={14} color="#f97316" />} {name}
                </div>
                <div style={{ 
                    fontSize: '0.65rem', fontWeight: 800, 
                    color: type === 'Hot' ? '#f97316' : type === 'Warm' ? '#d97706' : COLORS.blue,
                    background: type === 'Hot' ? '#fff7ed' : type === 'Warm' ? '#fef3c7' : '#eff6ff',
                    padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: type === 'Hot' ? '#f97316' : type === 'Warm' ? '#fbbf24' : COLORS.blue }} />
                    {type}
                </div>
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate400, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <Clock size={12} /> {time} • {info}
            </div>
            <div style={{ fontSize: '0.7rem', color: COLORS.slate800, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} style={{ color: COLORS.slate400 }} /> {details || '3 BHK • ₹1.25 Cr • Elan Epic'}
            </div>
        </div>
    </div>
);

const PredictiveCallListItem = ({ name, score, nextAction, details, onClick, isLast }: any) => {
    const starsCount = Math.min(5, Math.max(1, Math.round((score || 70) / 20)));
    const stars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

    return (
        <div 
            onClick={onClick}
            style={{ 
                display: 'flex', gap: '14px', padding: '14px 0', 
                borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
                cursor: 'pointer'
            }}
            className="hover-lift"
        >
            <div style={{ 
                width: 48, height: 48, borderRadius: '12px', overflow: 'hidden', 
                flexShrink: 0, background: `hsl(${(String(name || '#')).charCodeAt(0) * 47 % 360}, 60%, 55%)`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: '#fff', fontSize: '1rem', fontWeight: 'bold' 
            }}>
                {name?.charAt(0)?.toUpperCase()}{name?.split(' ')?.[1]?.charAt(0)?.toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: COLORS.slate950 }}>{name}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#8b5cf6' }}>{score || 91}%</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#eab308', letterSpacing: '1px' }}>{stars}</span>
                    <span style={{ fontSize: '0.62rem', color: COLORS.slate400, fontWeight: 700 }}>• {details || '3 BHK • BKC'}</span>
                </div>

                <div style={{ fontSize: '0.65rem', color: COLORS.slate500, fontWeight: 750, marginTop: '2px' }}>
                    <span style={{ color: COLORS.slate400, fontWeight: 700 }}>Next Best Action:</span> <span style={{ color: '#8b5cf6', fontWeight: 900 }}>{nextAction || 'Call'}</span>
                </div>
            </div>
        </div>
    );
};

const ActiveDealsCard = ({ deals = [] }) => (
    <div style={{ 
        background: '#fff', borderRadius: '24px', padding: '24px', 
        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex', flexDirection: 'column', gap: '20px', flex: 1.2
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 4, height: 16, background: COLORS.green, borderRadius: 2 }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.slate950, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Active Deals</h3>
            </div>
            <div style={{ background: '#ecfdf5', color: COLORS.green, padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900 }}>
                {deals.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0) >= 10000000 
                    ? `₹${(deals.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0) / 10000000).toFixed(3)} Cr` 
                    : `₹${(deals.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0) / 100000).toFixed(1)} L`}
            </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {deals.length > 0 ? deals.map((deal, idx) => (
                <div key={idx} className="hover-lift" style={{ 
                    padding: '20px', background: '#f8fafc', borderRadius: '20px', 
                    border: '1.5px solid #f1f5f9', display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center' 
                }}>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 950, color: COLORS.slate950, marginBottom: '6px' }}>{deal.unit_no || deal.unit_number || 'Unit B-402'}</div>
                        <div style={{ 
                            fontSize: '0.65rem', fontWeight: 900, 
                            color: deal.status === 'Booked' ? COLORS.green : COLORS.blue,
                            background: deal.status === 'Booked' ? '#ecfdf5' : '#eff6ff',
                            padding: '3px 10px', borderRadius: '8px', textTransform: 'uppercase'
                        }}>
                            {deal.status}
                        </div>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.slate950 }}>
                        {parseFloat(deal.total_amount) >= 10000000 
                            ? `₹${(parseFloat(deal.total_amount) / 10000000).toFixed(2)} Cr` 
                            : deal.total_amount ? `₹${(parseFloat(deal.total_amount) / 100000).toFixed(1)} L` : '--'}
                    </div>
                </div>
            )) : (
                <div style={{ 
                    padding: '24px', background: '#f8fafc', borderRadius: '20px', 
                    border: '2px dashed #e2e8f0', textAlign: 'center' 
                }}>
                    <div style={{ fontSize: '11px', color: COLORS.slate400, fontWeight: 600 }}>No active deals found</div>
                </div>
            )}
        </div>
    </div>
);


const AcademyCard = ({ xp = 0, level = 1, certifications = 0, score = 0, onClick }) => (
    <div 
        onClick={onClick}
        style={{ 
            background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', borderRadius: '24px', padding: '24px', 
            color: 'white', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1,
            boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)', position: 'relative', overflow: 'hidden',
            cursor: 'pointer'
        }}
        className="hover-lift"
    >
        <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.15 }}>
            <GraduationCap size={120} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}>
                    <ShieldCheck size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: 0.8 }}>Zentrix Rank</span>
                    <span style={{ fontSize: '1rem', fontWeight: 950 }}>Level {level} Closer</span>
                </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900 }}>
                {(parseInt(String(xp))||0).toLocaleString()} XP
            </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
                <span>XP Progress</span>
                <span>{((xp % 1000)/1000 * 100).toFixed(0)}% to Level {level + 1}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(xp % 1000)/1000 * 100}%`, height: '100%', background: '#fff', borderRadius: '4px' }} />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 950 }}>{certifications}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.8 }}>Certifications</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 950 }}>{score}%</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.8 }}>Avg. Sim Score</div>
            </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Objection Master"><Zap size={16} /></div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="HNI Expert"><Award size={16} /></div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>+3</div>
        </div>
    </div>
);
const LeaderboardWidget = ({ data = [], currentUser }: any) => {
    const closers = [
        { name: 'Tanu', roleLabel: 'Tanu (Rookie Closer)', progress: 95, revenue: "₹18.4L", deals: 6, winRate: 98, isMe: false },
        { name: 'Rohan', roleLabel: 'Rohan (Sales Agent)', progress: 88, revenue: "₹12.5L", deals: 4, winRate: 94, isMe: true },
        { name: 'Monika Mishra', roleLabel: 'Monika (Reception)', progress: 75, revenue: "₹9.8L", deals: 3, winRate: 92, isMe: false },
        { name: 'Surender', roleLabel: 'Surender (Broker Manager)', progress: 60, revenue: "₹6.4L", deals: 2, winRate: 88, isMe: false }
    ];

    return (
        <div style={{ 
            background: '#fff', borderRadius: '24px', padding: '20px', 
            border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex', flexDirection: 'column', gap: '16px', flex: 1.2
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} color={COLORS.orange} />
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.slate950, margin: 0, textTransform: 'uppercase' }}>Top Performers</h3>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>This Month</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {closers.map((agent, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', 
                        background: agent.isMe ? 'rgba(99, 102, 241, 0.05)' : '#f8fafc',
                        borderRadius: '16px', border: agent.isMe ? `1.5px solid #6366f1` : '1px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                    }}>
                        {/* Top Row: Medal, Avatar, Name, and Revenue */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{ fontSize: '1.2rem', display: 'inline-block', width: '24px', textAlign: 'center' }}>
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'}
                                </span>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#334155', flexShrink: 0 }}>
                                    {agent.name?.charAt(0)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: COLORS.slate950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: COLORS.slate500 }}>{agent.roleLabel}</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 950, color: '#10b981' }}>{agent.revenue}</div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 850, color: COLORS.slate400, textTransform: 'uppercase' }}>Closed Rev</div>
                            </div>
                        </div>

                        {/* Bottom Row: Progress bar and Stats indicators */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                                <div style={{ width: `${agent.progress}%`, height: '100%', background: idx === 0 ? '#fbbf24' : '#6366f1', borderRadius: '3px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: '8px' }}>
                                    {agent.deals} Deals
                                </span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '8px' }}>
                                    {agent.winRate}% Win
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RadialProgress = ({ percentage, size = 56, strokeWidth = 5, color, label, subtitle }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 900, color: COLORS.slate950
                }}>
                    {percentage}%
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: COLORS.slate950 }}>{label}</span>
                <span style={{ fontSize: '0.58rem', fontWeight: 700, color: COLORS.slate500, marginTop: '2px' }}>{subtitle}</span>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD VIEW ---
export default function AgentDashboardView({ user, data = {}, recentLeads = [], loading }: any) {
    const navigate = useNavigate();
    const [trendPeriod, setTrendPeriod] = useState('Month');
    const [performancePeriod, setPerformancePeriod] = useState('This Month');
    const [showPerfDropdown, setShowPerfDropdown] = useState(false);
    const isMobile = useMobile();
    
    // --- DATA MAPPING ---
    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const stages = stats.stages || [];
    const followups = stats.upcoming_followups || [];
    
    const displayFollowups = useMemo(() => {
        if (followups && followups.length > 0) return followups;
        return [
            { id: "f-m1", title: "Call Sanjay", priority: "High", timeStr: "09:30 AM", is_ai_generated: true, sub: "Lead Callback • High Priority" },
            { id: "f-m2", title: "Site Visit", priority: "High", timeStr: "10:00 AM", is_ai_generated: false, sub: "Project Tour • BKC Expressway" },
            { id: "f-m3", title: "Team Meeting", priority: "Normal", timeStr: "11:00 AM", is_ai_generated: false, sub: "Sales Pipeline Review" },
            { id: "f-m4", title: "Property Demo", priority: "High", timeStr: "01:00 PM", is_ai_generated: true, sub: "Virtual Walkthrough • 108 Prime" },
            { id: "f-m5", title: "Customer Call", priority: "High", timeStr: "03:00 PM", is_ai_generated: false, sub: "Objection Handling • Amit" }
        ];
    }, [followups]);
    
    const stageCounts = stages.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {});
    
    const chartData = useMemo(() => {
        const baseTrend = trendPeriod === 'Month' ? MONTHLY_TREND : YEARLY_TREND;
        // Count total leads in actual trends from API if available
        if (stats.trends && stats.trends.length > 0) {
            const totalLeads = stats.trends.reduce((sum: number, t: any) => sum + (t.leads || 0), 0);
            if (totalLeads > 1) {
                const factor = totalLeads / 340; // Scale relative to target
                return baseTrend.map((t) => ({
                    ...t,
                    leads: Math.max(1, Math.round(t.leads * (factor > 0.05 ? factor : 0.85))),
                    calls: Math.max(2, Math.round(t.calls * (factor > 0.05 ? factor : 0.85))),
                    follow: Math.max(1, Math.round(t.follow * (factor > 0.05 ? factor : 0.85))),
                    visits: Math.max(0, Math.round(t.visits * (factor > 0.05 ? factor : 0.85))),
                    conversions: Math.max(0, Math.round(t.conversions * (factor > 0.05 ? factor : 0.85)))
                }));
            }
        }
        return baseTrend;
    }, [stats.trends, trendPeriod]);
    
    const kpiData = {
        totalLeads: leads.active_leads || 0,
        pipelineValue: stats.pipeline?.value || 0,
        followups: followups.length || 0,
        siteVisits: stageCounts['Site Visit Done'] || 0,
        won: leads.won || bookings.total || 0,
        revenue: bookings.total_value || 0,
        winRate: leads.win_rate || 0
    };

    const formatCurrency = (val) => {
        if (!val) return '₹0';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val.toLocaleString()}`;
    };

    const formatRevenue = (val) => {
        if (!val) return '₹0';
        const cr = val / 10000000;
        return cr >= 1 ? `₹${cr.toFixed(1)} Cr` : `₹${(val / 100000).toFixed(0)} L`;
    };

    const sparkLines = useMemo(() => [
        [{v: 20}, {v: 25}, {v: 22}, {v: 30}, {v: 28}, {v: 45}, {v: 58}],
        [{v: 40}, {v: 45}, {v: 55}, {v: 50}, {v: 60}, {v: 65}, {v: 72}],
        [{v: 15}, {v: 18}, {v: 20}, {v: 25}, {v: 22}, {v: 28}, {v: 33}],
        [{v: 10}, {v: 12}, {v: 15}, {v: 14}, {v: 18}, {v: 20}, {v: 24}],
        [{v: 6}, {v: 7}, {v: 6.5}, {v: 8}, {v: 7.5}, {v: 9}, {v: 9.5}],
    ], []);

    const getGreeting = () => {
        const hour = dateUtils.getNow().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', 
            gap: '16px', padding: '0 20px 20px', paddingTop: 0, fontFamily: '"Inter", sans-serif',
            background: '#f8fafc', overflowY: 'auto'
        }}>
            <style>{`
                @keyframes skeletonPulse {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
            {/* Upper Header Segment */}
            <div className="agent-dash-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '8px', gap: isMobile ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '32px', flexDirection: isMobile ? 'column' : 'row' }}>
                    <div style={{ display: 'none', height: 0, overflow: 'hidden' }}>
                        <h1 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 900, color: COLORS.slate950, margin: 0, letterSpacing: '-0.02em' }}>
                            {getGreeting()}, {user?.name || 'Agent'} 👋
                        </h1>
                    </div>
                    {/* Quick Stats Integrated */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingLeft: isMobile ? '0' : '24px', borderLeft: isMobile ? 'none' : `1px solid ${COLORS.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, boxShadow: `0 0 10px ${COLORS.green}80` }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.slate400, textTransform: 'uppercase' }}>Logged Today</span>
                                <span style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.slate950 }}>{stats.telephony_stats?.calls_today || 0} Calls</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={16} color={COLORS.blue} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.slate400, textTransform: 'uppercase' }}>Avg Talk Time</span>
                                <span style={{ fontSize: '1rem', fontWeight: 950, color: COLORS.slate950 }}>
                                    {stats.telephony_stats?.talk_time_today 
                                        ? `${Math.floor(stats.telephony_stats.talk_time_today / 60)}m ${Math.round(stats.telephony_stats.talk_time_today % 60)}s` 
                                        : '0m'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 750, color: COLORS.slate600 }}>Performance for</span>
                        <div 
                            onClick={() => setShowPerfDropdown(!showPerfDropdown)}
                            style={{ 
                                background: '#fff', padding: '8px 16px', borderRadius: '12px', 
                                border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', 
                                gap: '8px', cursor: 'pointer', minWidth: '140px', justifyContent: 'space-between',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        >
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950 }}>{performancePeriod}</span>
                            <ChevronDown size={14} color={COLORS.slate400} />
                        </div>

                        {/* Add Lead Split Button */}
                        <div 
                            onClick={() => navigate('/leads')}
                            style={{ 
                                display: 'flex', alignItems: 'stretch', height: '36px', 
                                borderRadius: '12px', overflow: 'hidden', 
                                boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(92%)'; }}
                            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
                        >
                            <div style={{ 
                                background: COLORS.blue, padding: '0 16px', display: 'flex', 
                                alignItems: 'center', gap: '8px', color: '#fff',
                                fontSize: '0.8rem', fontWeight: 800, transition: 'all 0.2s'
                            }}>
                                <Plus size={16} strokeWidth={3} />
                                Add Lead
                            </div>
                            <div style={{ 
                                background: COLORS.blue, width: '32px', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', color: '#fff',
                                borderLeft: '1px solid rgba(255,255,255,0.2)',
                                transition: 'all 0.2s'
                            }}>
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>

                    {showPerfDropdown && (
                        <div style={{ 
                            position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                            background: '#fff', borderRadius: '12px', border: `1px solid ${COLORS.border}`,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, width: '180px',
                            maxHeight: '300px', overflowY: 'auto'
                        }}>
                            {['This Month', 'This Year', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(p => (
                                <div 
                                    key={p} 
                                    onClick={() => { setPerformancePeriod(p); setShowPerfDropdown(false); }}
                                    style={{ 
                                        padding: '10px 16px', fontSize: '0.8rem', fontWeight: 700, 
                                        color: performancePeriod === p ? COLORS.blue : COLORS.slate700,
                                        cursor: 'pointer', transition: 'background 0.2s',
                                        background: performancePeriod === p ? '#eff6ff' : 'transparent',
                                        borderBottom: `1px solid ${COLORS.border}`
                                    }}
                                    className="hover-bg-slate"
                                >
                                    {p}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {/* KPI Cards Row */}
            <div className="agent-dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: '12px' }}>
                <KPI onClick={() => navigate('/leads')} title="Total Leads" value={kpiData.totalLeads} perc="+5 today" isUp icon={Users} color={COLORS.blue} sparkData={sparkLines[0]} sparkColor={COLORS.blue} loading={loading} />
                <KPI onClick={() => navigate('/pipeline')} title="Pipeline Value" value={formatCurrency(kpiData.pipelineValue)} perc="+₹1.8L today" isUp icon={Briefcase} color={COLORS.orange} sparkData={sparkLines[1]} sparkColor={COLORS.orange} loading={loading} />
                <KPI onClick={() => navigate('/followups')} title="Follow-ups Due" value={kpiData.followups} perc="+3 today" isUp icon={Calendar} color="#8b5cf6" sparkData={sparkLines[2]} sparkColor="#8b5cf6" loading={loading} />
                <KPI onClick={() => navigate('/site-visits')} title="Site Visits" value={kpiData.siteVisits} perc="+1 today" isUp icon={MapPin} color={COLORS.cyan} sparkData={sparkLines[3]} sparkColor={COLORS.cyan} loading={loading} />
                <KPI onClick={() => navigate('/bookings')} title="Bookings" value={kpiData.won} perc="+1 today" isUp icon={CalendarCheck} color={COLORS.blue} sparkData={sparkLines[4]} sparkColor={COLORS.blue} loading={loading} />
                <KPI onClick={() => navigate('/analytics')} title="Revenue" value={formatCurrency(kpiData.revenue)} perc="+₹5.0L today" isUp icon={Trophy} color={COLORS.blue} sparkData={sparkLines[4]} sparkColor={COLORS.blue} loading={loading} />
            </div>

            {/* Main Content Grid */}
            <div className="agent-dash-main-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.15fr 1fr', gap: '16px' }}>
                
                {/* Activity Trend */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Lead Activity Trend</h3>
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                                {[
                                    { l: 'Leads', c: COLORS.blue },
                                    { l: 'Calls', c: COLORS.green },
                                    { l: 'Follow-ups', c: COLORS.orange },
                                    { l: 'Site Visits', c: COLORS.cyan },
                                    { l: 'Conversions', c: '#a855f7' }
                                ].map(item => (
                                    <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.c }} />
                                        {item.l}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div 
                                onClick={() => setTrendPeriod(trendPeriod === 'Month' ? 'Year' : 'Month')}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.75rem', fontWeight: 750, color: COLORS.slate950, cursor: 'pointer' }}
                            >
                                This {trendPeriod} <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '295px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.green} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.orange} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.orange} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" name="Leads" dataKey="leads" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#colorBlue)" dot={{ r: 4, fill: COLORS.blue, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Calls" dataKey="calls" stroke={COLORS.green} strokeWidth={2.5} fill="url(#colorGreen)" dot={{ r: 4, fill: COLORS.green, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Follow-ups" dataKey="follow" stroke={COLORS.orange} strokeWidth={2.5} fill="url(#colorOrange)" dot={{ r: 4, fill: COLORS.orange, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Site Visits" dataKey="visits" stroke={COLORS.cyan} strokeWidth={2.5} fill="url(#colorCyan)" dot={{ r: 4, fill: COLORS.cyan, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Conversions" dataKey="conversions" stroke="#a855f7" strokeWidth={3} fill="url(#colorPurple)" dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <AIDailyBriefing stats={stats} recentLeads={recentLeads} />

                {/* Column 3: Today's Priorities & Today's Goal Stacked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Today's Priorities */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        flex: 1
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Today's Priorities</h3>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f97316', background: '#fff7ed', padding: '4px 10px', borderRadius: '14px' }}>Urgent</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <PriorityItem onClick={() => navigate('/followups')} icon={AlertCircle} label="🔴 Overdue" count={2} color="#ef4444" bg="rgba(239, 68, 68, 0.1)" badgeColor="#ef4444" badgeBg="#fee2e2" />
                            <PriorityItem onClick={() => navigate('/calendar')} icon={Clock} label="🟠 Today" count={5} color="#ea580c" bg="rgba(249, 115, 22, 0.1)" badgeColor="#ea580c" badgeBg="#ffedd5" />
                            <PriorityItem isLast onClick={() => navigate('/calendar')} icon={Calendar} label="🟢 Tomorrow" count={3} color="#059669" bg="rgba(16, 185, 129, 0.1)" badgeColor="#059669" badgeBg="#d1fae5" />
                        </div>
                        <button 
                            onClick={() => navigate('/calendar')}
                            style={{ 
                                width: '100%', padding: '10px', marginTop: '14px', borderRadius: '12px', 
                                background: '#eff6ff', border: 'none', color: COLORS.slate700, 
                                fontSize: '0.85rem', fontWeight: 750, display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s'
                            }}
                            className="hover-lift"
                        >
                            <Calendar size={16} /> View Calendar
                        </button>
                    </div>

                    {/* Today's Goal */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span role="img" aria-label="target" style={{ fontSize: '0.95rem' }}>🎯</span>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Today's Goal</h3>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 850, color: COLORS.green, background: '#d1fae5', padding: '2px 6px', borderRadius: '6px' }}>68% Done</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '4px 0' }}>
                            <RadialProgress 
                                percentage={53} 
                                color={COLORS.blue} 
                                label="Calls" 
                                subtitle="8 / 15" 
                            />
                            <RadialProgress 
                                percentage={63} 
                                color={COLORS.orange} 
                                label="Follow-ups" 
                                subtitle="5 / 8" 
                            />
                            <RadialProgress 
                                percentage={67} 
                                color={COLORS.cyan} 
                                label="Site Visits" 
                                subtitle="2 / 3" 
                            />
                        </div>

                        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: COLORS.slate600 }}>Overall Progress</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate950 }}>68%</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Bottom Section */}
            <div className="agent-dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 1fr', gap: '16px' }}>
                
                {/* Column 1: Activities & Weekly Leaderboard (Stacked) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Activities */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        flex: 1
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Upcoming Activities</h3>
                            <div 
                                onClick={() => navigate('/calendar')}
                                style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                                View Calendar <ChevronRight size={12} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {displayFollowups && displayFollowups.length > 0 ? displayFollowups.slice(0, 5).map((f, i) => (
                                <TimelineItem 
                                    icon={Calendar}
                                    isAi={f.is_ai_generated}
                                    isLast={i === Math.min(displayFollowups.length - 1, 4)}
                                    onClick={() => navigate('/followups')}
                                    sub={f.sub || `Priority: ${f.priority || 'Normal'}`} 
                                    title={f.title || `${f.type} - ${f.lead_name || 'Unknown'}`} 
                                    badge="Upcoming" 
                                    badgeColor={COLORS.blue} 
                                    badgeBg="#eff6ff" 
                                    time={f.timeStr || dateUtils.formatCustom(f.scheduled_at, { hour: 'numeric', minute: '2-digit' })} 
                                    key={f.id}
                                />
                            )) : (
                                <div style={{ padding: '20px', fontSize: '0.85rem', color: COLORS.slate500, textAlign: 'center' }}>
                                    No upcoming activities scheduled.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Today's Schedule Timeline Card */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span role="img" aria-label="calendar" style={{ fontSize: '0.95rem' }}>📅</span>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Today's Timeline</h3>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 850, color: COLORS.blue, background: '#eff6ff', padding: '2px 8px', borderRadius: '8px' }}>Schedule Plan</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                            {/* Vertical line connecting timeline events */}
                            <div style={{ 
                                position: 'absolute', left: '44px', top: '10px', bottom: '10px', 
                                width: '2px', background: '#f1f5f9', zIndex: 1
                            }} />

                             {[
                                { time: '09:30', done: true, title: 'Call Amit', desc: 'Completed lead callback', color: '#3b82f6' },
                                { time: '10:30', done: true, title: 'Site Visit', desc: 'BKC Expressway Phase 2', color: '#10b981' },
                                { time: '12:00', done: false, title: 'Send Proposal', desc: '2BHK layout + quotation', color: '#ef4444' },
                                { time: '02:30', done: false, title: 'Follow-up', desc: 'Call back Sanjay regarding demo', color: '#3b82f6' },
                                { time: '04:00', done: false, title: 'Payment Reminder', desc: 'BKC Phase 1 installment', color: '#f97316' },
                                { time: '06:00', done: false, title: 'Team Meeting', desc: 'Weekly pipeline check-in', color: '#8b5cf6' }
                            ].map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative', zIndex: 2 }}>
                                    {/* Time Label */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate600, width: '38px', flexShrink: 0, marginTop: '2px' }}>
                                        {item.time}
                                    </div>
                                    
                                    {/* Checkbox / Circle Dot */}
                                    <div style={{ 
                                        width: '16px', height: '16px', borderRadius: '50%', 
                                        background: item.done ? item.color : '#fff',
                                        border: `2px solid ${item.color}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0, zIndex: 3, marginTop: '1px'
                                    }}>
                                        {item.done ? (
                                            <span style={{ color: '#fff', fontSize: '0.6.5rem', fontWeight: 950 }}>✓</span>
                                        ) : (
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: item.color }} />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ 
                                            fontSize: '0.78rem', fontWeight: 800, 
                                            color: item.done ? COLORS.slate500 : COLORS.slate950,
                                            textDecoration: item.done ? 'line-through' : 'none'
                                        }}>
                                            {item.title}
                                        </div>
                                        <div style={{ fontSize: '0.62rem', color: COLORS.slate600, marginTop: '1px' }}>
                                            {item.desc}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Leaderboard Widget */}
                    <LeaderboardWidget 
                        data={stats.academy?.leaderboard} 
                        currentUser={user}
                    />
                </div>

                {/* Performance Overview (Column 2) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, margin: '0 0 16px 0' }}>Top Performing Projects</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(stats as any).top_projects && (stats as any).top_projects.length > 0 ? (stats as any).top_projects.map((p: any, i: number) => (
                            <ProjectCard key={p.id || i} project={p} idx={i} />
                        )) : (
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', width: '100%', textAlign: 'center', fontSize: '0.8rem', color: COLORS.slate400 }}>
                                No project performance data available.
                            </div>
                        )}
                    </div>
                </div>

                    {/* My Sales Workspace (Sales Command Center) */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex', flexDirection: 'column', gap: '20px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Sales Workspace</h3>
                            <span style={{ fontSize: '0.62rem', fontWeight: 850, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>Command Center</span>
                        </div>

                        {/* 1. MY SALES PIPELINE Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate950, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>My Sales Pipeline</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {[
                                    { label: 'New Leads', val: stageCounts['New'] || 26, color: '#3b82f6' },
                                    { label: 'Qualified', val: stageCounts['Qualified'] || 14, color: '#10b981' },
                                    { label: 'Site Visits', val: stageCounts['Site Visit Scheduled'] || stageCounts['Site Visit Done'] || 7, color: '#eab308' },
                                    { label: 'Negotiation', val: stageCounts['Negotiation'] || 3, color: '#f97316' },
                                    { label: 'Booking Pending', val: stageCounts['Booking Pending'] || 1, color: '#ec4899' },
                                    { label: 'Closed', val: leads.won || 0, color: '#10b981', isCheck: true }
                                ].map((stage, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {stage.isCheck ? (
                                                <div style={{ width: 14, height: 14, borderRadius: '4px', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>✓</div>
                                            ) : (
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                                            )}
                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.slate700 }}>{stage.label}</span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.slate950 }}>{stage.val}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate600 }}>Pipeline Progress</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: COLORS.slate950 }}>62%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)', borderRadius: '3px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: `1px solid ${COLORS.border}` }} />

                        {/* 2. AI SALES COACH Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span role="img" aria-label="coach" style={{ fontSize: '0.95rem' }}>🤖</span>
                                <h4 style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate950, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Sales Coach</h4>
                                <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#8b5cf6', background: '#f3e8ff', padding: '1px 6px', borderRadius: '6px', marginLeft: '4px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>AI ACTIVE</span>
                            </div>
                            
                            <div style={{ 
                                background: 'linear-gradient(135deg, #f5efff 0%, #faf5ff 100%)', 
                                border: '1px solid rgba(139, 92, 246, 0.25)', 
                                borderRadius: '12px', padding: '12px', 
                                display: 'flex', flexDirection: 'column', gap: '8px',
                                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)'
                            }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 850, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Priority</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[
                                        'Call Amit Sharma before 11:00 AM',
                                        'Kirti Mishra is 87% likely to book',
                                        "Sanjay hasn't been contacted in 3 days"
                                    ].map((rec, rIdx) => (
                                        <div key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.72rem', color: COLORS.slate700, fontWeight: 650, lineHeight: 1.3 }}>
                                            <span style={{ color: '#8b5cf6', marginTop: '1px' }}>•</span>
                                            <span>{rec}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.slate400, textTransform: 'uppercase', marginTop: '4px' }}>Suggested Next Action</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => navigate('/followups')}
                                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: '#8b5cf6', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Phone size={11} /> Call Customer
                                    </button>
                                    <button 
                                        onClick={() => window.open('https://wa.me/')}
                                        style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <MessageSquare size={11} /> Send WhatsApp
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ borderTop: `1px solid ${COLORS.border}` }} />

                        {/* 3. QUICK ACTIONS Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span role="img" aria-label="zap" style={{ fontSize: '0.95rem' }}>⚡</span>
                                <h4 style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate950, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Actions</h4>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                {[
                                    { label: 'New Lead', action: () => navigate('/leads'), icon: Plus },
                                    { label: 'Schedule Visit', action: () => navigate('/calendar'), icon: Calendar },
                                    { label: 'Log Call', action: () => navigate('/followups'), icon: Phone },
                                    { label: 'Create Deal', action: () => navigate('/deals'), icon: Trophy },
                                    { label: 'Send Brochure', action: () => navigate('/leads'), icon: Megaphone },
                                    { label: 'Add Follow-up', action: () => navigate('/followups'), icon: Clock }
                                ].map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={item.action}
                                            style={{ 
                                                background: '#f8fafc', border: '1px solid #e2e8f0', 
                                                borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                                            }}
                                            className="hover-lift"
                                        >
                                            <Icon size={12} color={COLORS.slate600} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate800 }}>{item.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Column 3: AI Predictive Call List & Recent Activity Stacked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* AI Predictive Call List */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `2px solid rgba(139, 92, 246, 0.2)`,
                        boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.1)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.05, pointerEvents: 'none' }}>
                            <Sparkles size={100} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '8px' }}>
                                    <Sparkles size={16} color="#8b5cf6" />
                                </div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Predictive Call List</h3>
                            </div>
                            <div 
                                onClick={() => navigate('/leads')}
                                style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                                AI Selected <ChevronRight size={12} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: COLORS.slate400, marginBottom: '16px', fontWeight: 600 }}>Top recommendations based on recent engagement score.</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {recentLeads && recentLeads.length > 0 ? [...recentLeads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 4).map((lead, i) => (
                                <PredictiveCallListItem 
                                    key={lead.id}
                                    name={lead.name} 
                                    score={lead.score || 91}
                                    nextAction={lead.score > 80 ? 'Call' : 'WhatsApp'}
                                    details={`${lead.property_type || 'Any'} • ${lead.budget || 'N/A'}`} 
                                    onClick={() => navigate(`/leads/${lead.id}`)} 
                                    isLast={i === Math.min(recentLeads.length - 1, 3)}
                                />
                            )) : (
                                <div style={{ padding: '20px', fontSize: '0.85rem', color: COLORS.slate500, textAlign: 'center' }}>
                                    AI requires more interaction data.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Card */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Recent Activity</h3>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.slate400, textTransform: 'uppercase' }}>Live Feed</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { time: '10:30', title: 'Rohan closed Deal #102', desc: 'Project: BKC Residency', color: '#10b981', badge: 'Closed', bg: '#d1fae5' },
                                { time: '10:45', title: 'Sanjay completed visit', desc: 'Lead: Amit Kumar • BKC Phase 2', color: '#ea580c', badge: 'Site Visit', bg: '#ffedd5' },
                                { time: '11:20', title: 'AI assigned Hot Lead', desc: 'Assigned to Rohan Mishra', color: '#a855f7', badge: 'AI Agent', bg: '#f3e8ff' },
                                { time: '11:30', title: 'Payment received', desc: 'Amount: ₹5,00,000', color: '#2563eb', badge: '₹5,00,000', bg: '#dbeafe' }
                            ].map((act, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: COLORS.slate400, width: '38px', flexShrink: 0, marginTop: '2px' }}>
                                        {act.time}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.title}</div>
                                        <div style={{ fontSize: '0.65rem', color: COLORS.slate500 }}>{act.desc}</div>
                                    </div>
                                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: act.color, background: act.bg, padding: '2px 8px', borderRadius: '8px', flexShrink: 0 }}>
                                        {act.badge}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Achievement Card */}
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span role="img" aria-label="trophy" style={{ fontSize: '0.95rem' }}>🏆</span>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Monthly Achievement</h3>
                            </div>
                            <span style={{ fontSize: '0.62rem', fontWeight: 850, color: '#eab308', background: '#fef9c3', padding: '2px 8px', borderRadius: '8px' }}>Rank #2</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Revenue Goal */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.slate600 }}>Revenue Target</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: COLORS.slate950 }}>₹18.4L / ₹25L</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: '74%', height: '100%', background: 'linear-gradient(90deg, #f59e0b 0%, #eab308 100%)' }} />
                                </div>
                                <span style={{ fontSize: '0.6rem', color: COLORS.slate400, fontWeight: 700, textAlign: 'right' }}>74% achieved</span>
                            </div>

                            {/* Divider */}
                            <div style={{ borderTop: `1px dashed ${COLORS.border}` }} />

                            {/* Mini Metrics Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.slate500 }}>Deals Closed</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, marginTop: '2px' }}>4 / 6</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.slate500 }}>Current Rank</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#eab308', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                        🥇 #2 <span style={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.green }}>top 5%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                * {
                    transition: all 0.1s ease;
                }

                input::placeholder {
                    color: ${COLORS.slate400};
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}
