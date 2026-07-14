import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';

(async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const sqlContent = fs.readFileSync('src/migrations/stored_procedures_v2.sql', 'utf8');

    // Split on CREATE OR REPLACE FUNCTION to get individual procedures
    const procedures = sqlContent
        .split(/(?=CREATE OR REPLACE FUNCTION)/)
        .filter(s => s.trim().startsWith('CREATE'));

    console.log(`\n🚀 Deploying ${procedures.length} stored procedures to Supabase PostgreSQL...\n`);

    let success = 0;

    for (const proc of procedures) {
        const funcName = proc.match(/FUNCTION (\w+)/)?.[1] || 'unknown';
        try {
            await pool.query(proc);
            console.log(`  ✅ ${funcName}() deployed successfully`);
            success++;
        } catch (e: any) {
            console.log(`  ❌ ${funcName}(): ${e.message.substring(0, 120)}`);
        }
    }

    console.log(`\n══════════════════════════════════════`);
    console.log(`✅ Deployed: ${success}/${procedures.length} stored procedures`);
    console.log(`══════════════════════════════════════\n`);

    await pool.end();
    process.exit(0);
})();
