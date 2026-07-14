const req = {
    query: {
        stage: 'Qualified',
        agent: '123'
    },
    user: { role: 'agent', id: 'agent1' },
    tenantId: 'tenant1'
};

const limit = 50;
const page = 1;
const { stage, source, priority, agent, q, channel_partner_id, status, startDate, endDate } = req.query;
const offset = (page - 1) * limit;
const conditions = [`l.tenant_id = $1`];
const params = [req.tenantId];
let i = 2;

if (stage) { conditions.push(`l.stage = $${i++}`); params.push(stage); }
if (source) { conditions.push(`l.source = $${i++}`); params.push(source); }
if (priority) { conditions.push(`l.priority = $${i++}`); params.push(priority); }
if (agent) { 
    if (agent === 'Unassigned') {
        conditions.push(`l.assigned_to IS NULL`);
    } else {
        conditions.push(`l.assigned_to = $${i++}`); params.push(agent);
    }
}
if (channel_partner_id) { conditions.push(`l.channel_partner_id = $${i++}`); params.push(channel_partner_id); }
if (status) { conditions.push(`l.status = $${i++}`); params.push(status); }

if (startDate) {
    conditions.push(`l.created_at::date >= $${i++}`);
    params.push(startDate);
}
if (endDate) {
    conditions.push(`l.created_at::date <= $${i++}`);
    params.push(endDate);
}

if (req.query.nurture_due === 'true') {
    conditions.push(`l.status = 'Nurture' AND l.reconnect_date <= CURRENT_DATE`);
} else if (req.query.nurture_overdue === 'true') {
    conditions.push(`l.status = 'Nurture' AND l.reconnect_date < CURRENT_DATE`);
} else if (req.query.reconnect_date) {
    conditions.push(`l.reconnect_date = $${i++}`);
    params.push(req.query.reconnect_date);
}
if (q) { conditions.push(`(l.name ILIKE $${i} OR l.city ILIKE $${i} OR l.phone ILIKE $${i} OR l.email ILIKE $${i})`); params.push(`%${q}%`); i++; }

// Hierarchy Filter
if (req.user.role === 'agent') {
    conditions.push(`l.assigned_to = $${i++}`);
    params.push(req.user.id);
} else if (req.user.role === 'team_leader') {
    // Team Leader sees leads assigned to them OR their team members
    conditions.push(`(l.assigned_to = $${i} OR l.assigned_to IN (SELECT id FROM users WHERE reports_to = $${i}))`);
    params.push(req.user.id);
    i++;
} else if (req.user.role === 'sales_manager') {
    // Sales Manager sees leads assigned to them OR their downline (TLs and Agents)
    // We use a CTE or IN clause to find all users reporting to them directly or reporting to someone who reports to them
    conditions.push(`(
        l.assigned_to = $${i} 
        OR l.assigned_to IN (
            SELECT id FROM users WHERE reports_to = $${i}
            UNION
            SELECT id FROM users WHERE reports_to IN (SELECT id FROM users WHERE reports_to = $${i})
        )
        OR l.assigned_to IS NULL
    )`);
    params.push(req.user.id);
    i++;
}

const where = conditions.join(' AND ');

console.log("WHERE CLAUSE:\n", where);
console.log("PARAMS ARRAY LENGTH:", params.length);
console.log("i =", i);
console.log("LIMIT:", `$${i}`);
console.log("OFFSET:", `$${i + 1}`);
console.log("Final array:", [...params, limit, offset]);

