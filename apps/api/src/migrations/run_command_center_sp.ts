import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

(async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const sqlPath = path.join(process.cwd(), 'src/migrations/stored_procedures_v6_command_center.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log(`\n🚀 Deploying Command Center Intelligence Stored Procedure...\n`);

        await pool.query(sqlContent);
        console.log(`  ✅ get_command_center_intel() deployed successfully`);

        console.log(`\n══════════════════════════════════════`);
        console.log(`✅ Deployment Complete`);
        console.log(`══════════════════════════════════════\n`);
    } catch (e: any) {
        console.error(`  ❌ Deployment Failed:`, e.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
})();
