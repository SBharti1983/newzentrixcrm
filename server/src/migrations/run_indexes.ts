import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';

(async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const sqlContent = fs.readFileSync('src/migrations/add_performance_indexes.sql', 'utf8');

    const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.startsWith('CREATE'));

    console.log(`\n🚀 Running ${statements.length} performance indexes on Supabase PostgreSQL...\n`);

    let success = 0;
    let skipped = 0;

    for (const stmt of statements) {
        const indexName = stmt.match(/IF NOT EXISTS (\S+)/)?.[1] || 'unknown';
        try {
            const cleanStmt = stmt.replace('CONCURRENTLY ', '');
            await pool.query(cleanStmt);
            console.log(`  ✅ ${indexName}`);
            success++;
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                console.log(`  ⏭️  ${indexName} (already exists)`);
                skipped++;
            } else {
                console.log(`  ❌ ${indexName}: ${e.message.substring(0, 100)}`);
            }
        }
    }

    console.log(`\n══════════════════════════════════════`);
    console.log(`✅ Created: ${success} | ⏭️ Skipped: ${skipped} | Total: ${statements.length}`);
    console.log(`══════════════════════════════════════`);

    await pool.end();
    process.exit(0);
})();
