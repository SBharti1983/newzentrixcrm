require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const tid = '6f023c0a-a505-4ae4-962a-038a944d500e'; // Maya Infratech

    const agentRes = await pool.query("SELECT id FROM users WHERE email='demoagent@zentrix.com' AND tenant_id=$1", [tid]);
    const managerRes = await pool.query("SELECT id FROM users WHERE email='demomanager@zentrix.com' AND tenant_id=$1", [tid]);
    const adminRes = await pool.query("SELECT id FROM users WHERE email='demoadmin@zentrix.com' AND tenant_id=$1", [tid]);
    
    const agentId = agentRes.rows[0].id;
    const managerId = managerRes.rows[0].id;
    const adminId = adminRes.rows[0].id;

    // Sample leads data
    const sampleLeads = [
        // Agent leads
        { name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@gmail.com', source: 'MagicBricks', stage: 'Site Visit Done', budget: '1.2 Cr', assigned_to: agentId },
        { name: 'Priya Sharma', phone: '9876543211', email: 'priya.s@gmail.com', source: '99acres', stage: 'Negotiation', budget: '85 L', assigned_to: agentId },
        { name: 'Amit Patel', phone: '9876543212', email: 'amit.p@gmail.com', source: 'Walk-in', stage: 'Qualified', budget: '2 Cr', assigned_to: agentId },
        { name: 'Sneha Verma', phone: '9876543213', email: 'sneha.v@gmail.com', source: 'Facebook', stage: 'New Lead', budget: '60 L', assigned_to: agentId },
        { name: 'Vikash Gupta', phone: '9876543214', email: 'vikash@gmail.com', source: 'Referral', stage: 'Won', budget: '1.5 Cr', assigned_to: agentId },
        { name: 'Meena Joshi', phone: '9876543215', email: 'meena@gmail.com', source: 'Instagram', stage: 'Connected', budget: '75 L', assigned_to: agentId },
        { name: 'Ravi Tiwari', phone: '9876543250', email: 'ravi.t@gmail.com', source: 'Google Ads', stage: 'Site Visit Scheduled', budget: '1 Cr', assigned_to: agentId },
        
        // Manager leads
        { name: 'Arun Nair', phone: '9876543216', email: 'arun@gmail.com', source: 'Housing.com', stage: 'Interested', budget: '3 Cr', assigned_to: managerId },
        { name: 'Kavita Singh', phone: '9876543217', email: 'kavita@gmail.com', source: 'Google Ads', stage: 'Proposal Shared', budget: '1.8 Cr', assigned_to: managerId },
        { name: 'Deepak Yadav', phone: '9876543218', email: 'deepak@gmail.com', source: 'Walk-in', stage: 'Won', budget: '2.5 Cr', assigned_to: managerId },
        { name: 'Sunita Devi', phone: '9876543219', email: 'sunita@gmail.com', source: 'Referral', stage: 'Negotiation', budget: '95 L', assigned_to: managerId },
        { name: 'Mohit Kapoor', phone: '9876543220', email: 'mohit@gmail.com', source: 'MagicBricks', stage: 'New Lead', budget: '1.1 Cr', assigned_to: managerId },
        
        // Admin leads
        { name: 'Neelam Rao', phone: '9876543221', email: 'neelam@gmail.com', source: '99acres', stage: 'Connected', budget: '70 L', assigned_to: adminId },
        { name: 'Suresh Menon', phone: '9876543222', email: 'suresh@gmail.com', source: 'Facebook', stage: 'Lost', budget: '4 Cr', assigned_to: adminId },
        { name: 'Anita Mishra', phone: '9876543223', email: 'anita@gmail.com', source: 'Google Ads', stage: 'Site Visit Done', budget: '1.3 Cr', assigned_to: adminId },
        { name: 'Rahul Saxena', phone: '9876543224', email: 'rahul.s@gmail.com', source: 'Walk-in', stage: 'Won', budget: '2.1 Cr', assigned_to: adminId },
        { name: 'Pooja Chauhan', phone: '9876543225', email: 'pooja@gmail.com', source: 'Instagram', stage: 'Qualified', budget: '55 L', assigned_to: adminId },
    ];

    console.log('Creating', sampleLeads.length, 'leads...\n');

    for (const lead of sampleLeads) {
        try {
            const res = await pool.query(
                `INSERT INTO leads(tenant_id, name, phone, email, source, stage, budget, assigned_to, created_at)
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, NOW() - interval '${Math.floor(Math.random() * 30)} days')
                 RETURNING id`,
                [tid, lead.name, lead.phone, lead.email, lead.source, lead.stage, lead.budget, lead.assigned_to]
            );
            console.log('✅', lead.name, '|', lead.stage, '| Assigned:', lead.assigned_to === agentId ? 'Agent' : lead.assigned_to === managerId ? 'Manager' : 'Admin');
            
            // Create a follow-up for active leads
            if (!['Won', 'Lost'].includes(lead.stage)) {
                await pool.query(
                    `INSERT INTO followups(tenant_id, lead_id, assigned_to, type, priority, status, scheduled_at, note)
                     VALUES($1, $2, $3, $4, $5, 'Pending', NOW() + interval '${Math.floor(Math.random() * 48) + 1} hours', $6)`,
                    [tid, res.rows[0].id, lead.assigned_to, 
                     ['Call', 'Site Visit', 'WhatsApp', 'Email'][Math.floor(Math.random() * 4)],
                     ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
                     'Follow up with ' + lead.name]
                );
            }
        } catch (e) {
            console.error('❌', lead.name, e.message);
        }
    }

    console.log('\n✅ All done! Refresh dashboard now.');
    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
