import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from apps/api/.env
config({ path: resolve(__dirname, '../../../apps/api/.env') });

async function testReflection() {
    console.log('🏁 Starting end-to-end self-reflection integration test...');

    const { pool } = await import('@zentrix/database');
    const { processReflectionJob } = await import('../../../apps/worker/src/jobs/reflectionJob');

    const tenantId = '1bbc00c0-766f-498d-9814-b9fdeb56b24d'; // Maya Infratech
    const leadId = '75db6096-0dd0-4b19-8d8c-3f4188b2abfe'; // Haresh Kumar
    const testSessionId = 'test-session-reflection-123';

    // 1. Delete any existing test interactions to start clean
    await pool.query(
        "DELETE FROM interactions WHERE note = 'Test reflection mock bad call'",
    );

    // Query the Rohan persona's user_id from the database
    const { rows: personas } = await pool.query(
        "SELECT id, user_id FROM ai_employee_personas WHERE tenant_id = $1 AND role = 'rohan'",
        [tenantId]
    );
    const rohanUserId = personas[0]?.user_id || null;

    // 2. Insert a mock bad call interaction with rapport_score = 3
    console.log('📥 Inserting mock bad call interaction with rapport_score = 3...');
    const transcript = `
Customer: Hello?
Rohan: Namaste! Zentrix Realty se Rohan bol raha hoon. BKC Phase 2 ke flat ke baare me baat karni hai.
Customer: Phase 2 me location badhiya hai par price kya hai?
Rohan: Price 2.5 Crore se shuru hota hai.
Customer: 2.5 Crore? Ye toh mere budget se bahut zyada hai!
Rohan: Haan, toh aap 1BHK le lijiye, budget me aa jayega.
Customer: 1BHK kyu loon main? Mujhe 3BHK chahiye. Aur aapka behave bilkul achha nahi hai. Main booking nahi karunga. Bye.
`;

    await pool.query(
        `INSERT INTO interactions (
            tenant_id, lead_id, user_id, type, date, duration, note, outcome, sentiment,
            rapport_score, closing_score, projects_discussed, transcript
        ) VALUES (
            $1::uuid, $2::uuid, $3::uuid, 'Call', NOW(), 120, 'Test reflection mock bad call',
            'Disengaged', 'negative', 3, 2, ARRAY['BKC Phase 2'], $4
        )`,
        [tenantId, leadId, rohanUserId, transcript]
    );
    console.log('✅ Mock bad call interaction inserted.');

    // 3. Print current boundaries
    const { rows: personasBefore } = await pool.query(
        "SELECT id, knowledge_scope FROM ai_employee_personas WHERE tenant_id = $1 AND role = 'rohan'",
        [tenantId]
    );
    console.log('Original Persona boundaries:', personasBefore[0]?.knowledge_scope?.boundaries || 'None');

    // 4. Run the reflection job
    console.log('🧠 Running reflection job loop...');
    await processReflectionJob();

    // 5. Verify database updates
    const { rows: personasAfter } = await pool.query(
        "SELECT id, knowledge_scope FROM ai_employee_personas WHERE tenant_id = $1 AND role = 'rohan'",
        [tenantId]
    );

    console.log('\n==================================================');
    console.log('VERIFICATION RESULTS');
    console.log('==================================================');
    const updatedBoundaries = personasAfter[0]?.knowledge_scope?.boundaries;
    console.log('Updated Persona boundaries:', updatedBoundaries || 'None');

    if (updatedBoundaries && updatedBoundaries.toLowerCase().includes('remember')) {
        console.log('\n🎉 SUCCESS: Reflection job successfully executed and updated persona boundaries!');
    } else {
        console.error('\n❌ FAILURE: Persona boundaries were not updated.');
    }

    // Clean up
    await pool.query(
        "DELETE FROM interactions WHERE note = 'Test reflection mock bad call'",
    );
    await pool.end();
    process.exit(0);
}

testReflection().catch((err) => {
    console.error('Error during test:', err);
    process.exit(1);
});
