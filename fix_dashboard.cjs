const fs = require('fs');

let file = fs.readFileSync('src/pages/ManagerDashboardView.jsx', 'utf8');

// 1. Remove Top static data
file = file.replace(/const KPI_DATA = [\s\S]*?\];/g, '');
file = file.replace(/const TEAM_PERFORMANCE = [\s\S]*?\];/g, '');

// 2. Change signature
file = file.replace('export default function ManagerDashboardView({ user }) {',
`export default function ManagerDashboardView({ user, data }) {
    const stats = data || {};
    const leads = stats.leads || {};
    const bookings = stats.bookings || {};
    const members = stats.members || [];
    const pipeline = stats.pipeline || {};
    const upcomingFollowups = stats.upcoming_followups || [];

    const formatRevenue = (val) => {
        if (!val) return '₹0';
        const num = Number(val);
        const cr = num / 10000000;
        return cr >= 1 ? \`₹\${cr.toFixed(2)} Cr\` : \`₹\${(num / 100000).toFixed(1)} L\`;
    };

    const mockSpark = [{v:2},{v:3},{v:5},{v:4},{v:8},{v:7},{v:10}];
    const KPI_DATA = [
        { title: 'Team Revenue', value: formatRevenue(bookings.total_value), isUp: true, perc: '19.6%', iconColor: '#10b981', sparkData: mockSpark, color: '#10b981' },
        { title: 'Team Bookings', value: bookings.total || '0', isUp: true, perc: '16.6%', iconColor: '#8b5cf6', sparkData: mockSpark, color: '#8b5cf6' },
        { title: 'Team Leads', value: leads.active_leads || '0', isUp: true, perc: '13.9%', iconColor: '#3b82f6', sparkData: mockSpark, color: '#3b82f6' },
        { title: 'Avg. Conversion', value: \`\${leads.win_rate || 0}%\`, isUp: true, perc: '1.2%', iconColor: '#f97316', sparkData: mockSpark, color: '#f97316' }
    ];

    const TEAM_PERFORMANCE = members.map(m => ({
        name: m.name,
        img: m.avatar || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(m.name)}\`,
        rev: formatRevenue(m.total_value),
        revRaw: Number(m.total_value) || 0,
        bookings: m.bookings,
        max: Math.max(...members.map(x => Number(x.total_value) || 0), 1)
    })).sort((a,b) => b.revRaw - a.revRaw);
`);

// 3. Active Agents
file = file.replace(/18 <span style={{fontSize: '1\.2rem', color: COLORS\.slate400, fontWeight: 600}}>\/ 22<\/span>/, 
`{members.length} <span style={{fontSize: '1.2rem', color: COLORS.slate400, fontWeight: 600}}> Agents</span>`);

// 4. Team Pipeline Summary
const oldPipelineArr = `[
                            { val: '138', label: 'Leads' },
                            { val: '122', label: 'Calls' },
                            { val: '76', label: 'Visits' },
                            { val: '29', label: 'Bookings' },
                            { val: '₹11.4L', label: 'Revenue' }
                        ]`;
const newPipelineArr = `[
                            { val: leads.active_leads || '0', label: 'Leads' },
                            { val: leads.new_this_month || '0', label: 'New Leads' },
                            { val: formatRevenue(pipeline.value), label: 'Pipeline Val' },
                            { val: bookings.total || '0', label: 'Bookings' },
                            { val: formatRevenue(bookings.total_value), label: 'Revenue' }
                        ]`;
file = file.replace(oldPipelineArr, newPipelineArr);

// 5. Team Performance bars fix
// \${(parseFloat(agent.rev.replace('₹','').replace('L','')) / agent.max) * 100}%
// Replace with: \${(agent.revRaw / agent.max) * 100}%
file = file.replace("{(parseFloat(agent.rev.replace('₹','').replace('L','')) / agent.max) * 100}%", "{(agent.revRaw / agent.max) * 100}%");

// 6. Dynamic leaderboard
const oldLeaderboard = `{/* #2 Rank */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&q=80" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0' }} />
                                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#94a3b8', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>2</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px' }}>Priya Singh</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950, marginTop: '2px' }}>₹2.8L</div>
                        </div>

                        {/* #1 Rank */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fef3c7', padding: '12px 16px', borderRadius: '12px', position: 'relative', top: '-16px' }}>
                            <Award size={24} color="#f59e0b" style={{ position: 'absolute', top: '-16px' }} />
                            <div style={{ position: 'relative', width: '56px', height: '56px', marginTop: '4px' }}>
                                <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&q=80" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f59e0b' }} />
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px' }}>Aman Gupta</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, marginTop: '2px' }}>₹3.9L</div>
                        </div>

                        {/* #3 Rank */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&q=80" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fdba74' }} />
                                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#f97316', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>3</div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px' }}>Anil Wadhwa</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950, marginTop: '2px' }}>₹2.3L</div>
                        </div>`;

const newLeaderboard = `{TEAM_PERFORMANCE[1] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                    <img src={TEAM_PERFORMANCE[1].img} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e2e8f0' }} />
                                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#94a3b8', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>2</div>
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px', maxWidth: '80px', overflow:'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{TEAM_PERFORMANCE[1].name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950, marginTop: '2px' }}>{TEAM_PERFORMANCE[1].rev}</div>
                            </div>
                        )}
                        {TEAM_PERFORMANCE[0] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fef3c7', padding: '12px 16px', borderRadius: '12px', position: 'relative', top: '-16px' }}>
                                <Award size={24} color="#f59e0b" style={{ position: 'absolute', top: '-16px' }} />
                                <div style={{ position: 'relative', width: '56px', height: '56px', marginTop: '4px' }}>
                                    <img src={TEAM_PERFORMANCE[0].img} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f59e0b' }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px', maxWidth: '80px', overflow:'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{TEAM_PERFORMANCE[0].name}</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: COLORS.slate950, marginTop: '2px' }}>{TEAM_PERFORMANCE[0].rev}</div>
                            </div>
                        )}
                        {TEAM_PERFORMANCE[2] && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                                    <img src={TEAM_PERFORMANCE[2].img} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fdba74' }} />
                                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#f97316', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>3</div>
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate950, marginTop: '8px', maxWidth: '80px', overflow:'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{TEAM_PERFORMANCE[2].name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950, marginTop: '2px' }}>{TEAM_PERFORMANCE[2].rev}</div>
                            </div>
                        )}`;
file = file.replace(oldLeaderboard, newLeaderboard);


// 7. Update bottom static leaderboard items
const oldRanks = `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: \`1px solid \${COLORS.border}\` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400, width: '12px' }}>4</div>
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&q=80" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.slate700 }}>Mahesh Tiwari</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>₹1.6L</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: \`1px solid \${COLORS.border}\` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400, width: '12px' }}>5</div>
                                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&q=80" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.slate700 }}>Viren Mathur</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>₹0.8L</div>
                        </div>
                    </div>`;

const newRanks = `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {TEAM_PERFORMANCE.slice(3, 5).map((agent, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: \`1px solid \${COLORS.border}\` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: COLORS.slate400, width: '12px' }}>{idx + 4}</div>
                                <img src={agent.img} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.slate700, maxWidth: '100px', overflow:'hidden', textOverflow: 'ellipsis', whiteSpace:'nowrap' }}>{agent.name}</div>
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.slate950 }}>{agent.rev}</div>
                        </div>
                    ))}
                    </div>`;

file = file.replace(oldRanks, newRanks);

// 8. Dynamic Follow-ups Tasks
const tasksRegex = /<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>\s*<div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1\.2rem', fontWeight: 800 }}>5<\/div>[\s\S]*?<div>[\s\S]*?<div style={{ fontSize: '0\.9rem', fontWeight: 800, color: COLORS\.slate950 }}>Follow-ups<\/div>[\s\S]*?<div style={{ fontSize: '0\.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>2 overdue<\/div>[\s\S]*?<\/div>\s*<\/div>/;

file = file.replace(tasksRegex, 
`<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>{upcomingFollowups.length}</div>
    <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.slate950 }}>Follow-ups</div>
        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>Due soon</div>
    </div>
</div>`);

fs.writeFileSync('src/pages/ManagerDashboardView.jsx', file);
console.log('Done mapping dynamic data.');
