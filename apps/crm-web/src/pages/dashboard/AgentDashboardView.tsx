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
    CheckSquare, FileBarChart, Megaphone, Settings, HelpCircle, Plus, Smartphone, Zap, Trophy
} from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import AIDailyBriefing from '../../components/AIDailyBriefing';
import * as dateUtils from '../../utils/dateUtils';

// --- DEMO DATA ---
const YEARLY_TREND = [
  { name: 'Jan', leads: 40, calls: 55, follow: 20, visits: 10 },
  { name: 'Feb', leads: 45, calls: 60, follow: 25, visits: 15 },
  { name: 'Mar', leads: 55, calls: 75, follow: 30, visits: 22 },
  { name: 'Apr', leads: 50, calls: 65, follow: 28, visits: 18 },
  { name: 'May', leads: 62, calls: 80, follow: 35, visits: 28 },
  { name: 'Jun', leads: 58, calls: 72, follow: 32, visits: 24 },
  { name: 'Jul', leads: 65, calls: 85, follow: 38, visits: 30 },
  { name: 'Aug', leads: 70, calls: 95, follow: 42, visits: 35 },
  { name: 'Sep', leads: 75, calls: 100, follow: 48, visits: 40 },
  { name: 'Oct', leads: 82, calls: 110, follow: 55, visits: 45 },
  { name: 'Nov', leads: 88, calls: 120, follow: 60, visits: 50 },
  { name: 'Dec', leads: 95, calls: 130, follow: 68, visits: 58 },
];

const MONTHLY_TREND = [
  { name: 'Apr 1', leads: 20, calls: 30, follow: 10, visits: 5 },
  { name: 'Apr 6', leads: 35, calls: 45, follow: 15, visits: 10 },
  { name: 'Apr 12', leads: 50, calls: 65, follow: 25, visits: 20 },
  { name: 'Apr 18', leads: 40, calls: 50, follow: 18, visits: 15 },
  { name: 'Apr 24', leads: 62, calls: 80, follow: 35, visits: 28 },
  { name: 'Apr 27', leads: 42, calls: 58, follow: 33, visits: 24 },
  { name: 'Apr 30', leads: 70, calls: 90, follow: 45, visits: 35 },
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

const KPI = ({ title, value, perc, isUp, icon: Icon, color, sparkData, sparkColor, target, curr, dark, onClick, loading }: any) => (
    <div 
        onClick={onClick}
        style={{ 
            background: dark ? COLORS.slate900 : '#fff', 
            borderRadius: '12px', padding: '14px', 
            border: dark ? 'none' : `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            display: 'flex', flexDirection: 'column', gap: '4px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: dark ? '#cbd5e1' : COLORS.slate600 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={14} />}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{title}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: dark ? '#fff' : COLORS.slate950 }}>{value}</div>
                {!target && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isUp ? COLORS.green : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                            {isUp ? <TrendingUp size={10} /> : '↓'} {perc}
                        </div>
                    </div>
                )}
            </div>
            {!target && sparkData && (
                <div style={{ width: 50, height: 25 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData}>
                            <Area type="monotone" dataKey="v" stroke={sparkColor} fill={sparkColor} fillOpacity={0.1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            {target && (
                <div style={{ flex: 1, marginLeft: '16px', marginBottom: '4px' }}>
                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: '60%', height: '100%', background: COLORS.blue, borderRadius: '3px' }} />
                    </div>
                </div>
            )}
        </div>
    </div>
);

const PriorityItem = ({ icon: Icon, color, bg, label, count, onClick, isLast }: any) => (
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
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: COLORS.slate700 }}>{label}</span>
        </div>
        <div style={{ 
            minWidth: 28, height: 22, background: '#fff1f2', color: '#e11d48', 
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

const ProjectChip = ({ title, img }: any) => (
    <div style={{ flex: 1 }}>
        <div style={{ width: '100%', height: '85px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
            <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.slate950 }}>{title}</div>
    </div>
);

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
const LeaderboardWidget = ({ data = [], currentUser }) => (
    <div style={{ 
        background: '#fff', borderRadius: '24px', padding: '20px', 
        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex', flexDirection: 'column', gap: '16px', flex: 1.2
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} color={COLORS.orange} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 950, color: COLORS.slate950, margin: 0, textTransform: 'uppercase' }}>Weekly Top Closers</h3>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: COLORS.slate400, textTransform: 'uppercase' }}>Hall of Fame</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data && data.length > 0 ? data.slice(0, 4) : [
                { name: 'Anjali Sharma', xp: 18400, level: 12 },
                { name: 'Rahul Varma', xp: 12250, level: 9 },
                { name: 'Priya Singh', xp: 10800, level: 8 }
            ]).map((agent, idx) => (
                <div key={idx} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', 
                    background: (agent.id === currentUser?.id || agent.isMe) ? 'rgba(139, 92, 246, 0.05)' : '#f8fafc',
                    borderRadius: '14px', border: (agent.id === currentUser?.id || agent.isMe) ? `1px solid ${COLORS.blue}22` : '1px solid #f1f5f9'
                }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : COLORS.slate100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: idx <= 2 ? '#fff' : COLORS.slate400 }}>
                        {idx + 1}
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: COLORS.slate200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate600 }}>
                        {agent.avatar ? <img src={agent.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : (agent.name?.charAt(0) || 'U')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.slate950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: COLORS.slate500 }}>Level {agent.level} • {agent.rank_title || 'Closer'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: COLORS.blue }}>{(agent.xp || agent.total_xp || 0).toLocaleString()}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: COLORS.slate400 }}>XP</div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

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
    
    const stageCounts = stages.reduce((acc, s) => ({ ...acc, [s.stage]: parseInt(s.count) || 0 }), {});
    
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
                <KPI onClick={() => navigate('/leads')} title="Total Leads" value={kpiData.totalLeads} perc={`${leads.new_this_month || 0} New`} isUp icon={Users} color={COLORS.blue} sparkData={sparkLines[0]} sparkColor={COLORS.blue} loading={loading} />
                <KPI onClick={() => navigate('/pipeline')} title="Pipeline Value" value={formatCurrency(kpiData.pipelineValue)} perc={`${kpiData.totalLeads} Active`} isUp icon={Briefcase} color={COLORS.orange} sparkData={sparkLines[1]} sparkColor={COLORS.orange} loading={loading} />
                <KPI onClick={() => navigate('/followups')} title="Follow-ups Due" value={kpiData.followups} perc="Pending" isUp icon={Calendar} color="#8b5cf6" sparkData={sparkLines[2]} sparkColor="#8b5cf6" loading={loading} />
                <KPI onClick={() => navigate('/site-visits')} title="Site Visits" value={kpiData.siteVisits} perc="Completed" isUp icon={MapPin} color={COLORS.cyan} sparkData={sparkLines[3]} sparkColor={COLORS.cyan} loading={loading} />
                <KPI onClick={() => navigate('/bookings')} title="Bookings" value={kpiData.won} target={0} curr={kpiData.won} icon={CalendarCheck} color={COLORS.blue} loading={loading} />
                <KPI onClick={() => navigate('/analytics')} title="Revenue" value={formatCurrency(kpiData.revenue)} perc={`${kpiData.winRate}% Win Rate`} isUp sparkData={sparkLines[4]} sparkColor={COLORS.blue} loading={loading} />
            </div>

            {/* Main Content Grid */}
            <div className="agent-dash-main-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '16px' }}>
                
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
                                    { l: 'Site Visits', c: COLORS.cyan }
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
                    <div style={{ height: '220px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendPeriod === 'Month' ? (stats.trends && stats.trends.length > 0 ? stats.trends : MONTHLY_TREND) : YEARLY_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.green} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.orange} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.orange} stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.slate400, fontWeight: 700 }} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" name="Leads" dataKey="leads" stroke={COLORS.blue} strokeWidth={2.5} fill="url(#colorBlue)" dot={{ r: 4, fill: COLORS.blue, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Calls" dataKey="calls" stroke={COLORS.green} strokeWidth={2.5} fill="url(#colorGreen)" dot={{ r: 4, fill: COLORS.green, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Follow-ups" dataKey="follow" stroke={COLORS.orange} strokeWidth={2.5} fill="url(#colorOrange)" dot={{ r: 4, fill: COLORS.orange, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" name="Site Visits" dataKey="visits" stroke={COLORS.cyan} strokeWidth={2.5} fill="url(#colorCyan)" dot={{ r: 4, fill: COLORS.cyan, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <AIDailyBriefing />

                {/* Today's Priorities */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '12px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Today's Priorities</h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f97316', background: '#fff7ed', padding: '4px 10px', borderRadius: '14px' }}>{followups.length} Pending</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <PriorityItem onClick={() => navigate('/followups')} icon={Calendar} label="Follow-ups Due" count={kpiData.followups} color={COLORS.orange} bg="#fff7ed" />
                        <PriorityItem onClick={() => navigate('/site-visits')} icon={UserCheck} label="Site Visits Scheduled" count={kpiData.siteVisits} color="#3b82f6" bg="#eff6ff" />
                        <PriorityItem isLast onClick={() => navigate('/pipeline')} icon={Flame} label="Hot Leads to Contact" count={stageCounts['Negotiation'] || 0} color="#f97316" bg="#fff7ed" />
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
            </div>



            {/* Bottom Section */}
            <div className="agent-dash-bottom-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr', gap: '16px' }}>
                
                {/* Weekly Leaderboard Widget */}
                <LeaderboardWidget 
                    data={stats.academy?.leaderboard} 
                    currentUser={user}
                />
                
                {/* Activities */}
                <div style={{ 
                    background: '#fff', borderRadius: '20px', padding: '20px', 
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
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
                        {followups && followups.length > 0 ? followups.slice(0, 3).map((f, i) => (
                            <TimelineItem 
                                icon={Calendar}
                                isAi={f.is_ai_generated}
                                isLast={i === Math.min(followups.length - 1, 2)}
                                onClick={() => navigate('/followups')}
                                sub={`Priority: ${f.priority || 'Normal'}`} 
                                title={`${f.type} - ${f.lead_name || 'Unknown'}`} 
                                badge="Upcoming" 
                                badgeColor={COLORS.blue} 
                                badgeBg="#eff6ff" 
                                time={dateUtils.formatCustom(f.scheduled_at, { hour: 'numeric', minute: '2-digit' })} 
                                key={f.id}
                            />
                        )) : (
                            <div style={{ padding: '20px', fontSize: '0.85rem', color: COLORS.slate500, textAlign: 'center' }}>
                                No upcoming activities scheduled.
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Overview (Column 2) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ 
                        background: '#fff', borderRadius: '20px', padding: '20px', 
                        border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, color: COLORS.slate950, margin: 0 }}>Performance Overview</h3>
                            <div 
                                onClick={() => setPerformancePeriod(performancePeriod === 'Month' ? 'Year' : 'Month')}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '4px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '0.75rem', fontWeight: 750, color: COLORS.slate950, cursor: 'pointer' }}
                            >
                                {performancePeriod} <ChevronDown size={14} />
                            </div>
                        </div>

                        <div className="agent-dash-perf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                            {[
                                { label: 'Avg. Response Time', val: `${(stats as any).pipeline?.avg_response_time || 0} mins`, sub: (stats as any).pipeline?.avg_response_time < 30 ? '↓ Optimal' : '↑ Needs action', color: (stats as any).pipeline?.avg_response_time < 30 ? COLORS.green : COLORS.orange },
                                { label: 'Deals in Pipeline', val: (stats as any).leads?.active_leads || 0, sub: `↑ Live Pipeline`, color: COLORS.green },
                                { label: 'Win Rate', val: `${(stats as any).leads?.win_rate || 0}%`, sub: `Overall Performance`, color: COLORS.green },
                                { label: 'Avg. Deal Size', val: formatRevenue((stats as any).pipeline?.avg_deal_size), sub: `↑ Portfolio Value`, color: COLORS.green }
                            ].map(m => (
                                <div key={m.label} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: COLORS.slate600, marginBottom: '6px' }}>{m.label}</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '4px' }}>{m.val}</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: m.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {m.sub}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: COLORS.slate950, marginBottom: '12px' }}>Top Performing Projects</h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {(stats as any).top_projects && (stats as any).top_projects.length > 0 ? (stats as any).top_projects.map((p: any, i: number) => (
                                    <ProjectChip 
                                        key={p.id || i}
                                        title={p.name} 
                                        img={p.image_url || `https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80`} 
                                    />
                                )) : (
                                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', width: '100%', textAlign: 'center', fontSize: '0.8rem', color: COLORS.slate400 }}>
                                        No project performance data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* AI Predictive Call List (Column 3) */}
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
                            <LeadListItem 
                                key={lead.id}
                                name={lead.name} 
                                type={lead.score > 80 ? 'Hot' : lead.score > 60 ? 'Warm' : 'Cold'} 
                                time={`Score: ${lead.score || 0}`} 
                                info={lead.stage} 
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
