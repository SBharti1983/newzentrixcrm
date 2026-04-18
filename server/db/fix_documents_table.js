/**
 * PATCH: Fix Documents Table Schema
 * Updates the 'documents' table to support the new Agreements & Docs feature.
 * Run this if you are getting "Failed to fetch documents" errors.
 */
require('dotenv').config();
const pool = require('./pool');

async function fix() {
    let client;
    try {
        client = await pool.connect();
        console.log('🔄 PATCHING DOCUMENTS TABLE...');

        // 1. Add missing columns
        const queries = [
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS name TEXT`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Other'`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_url TEXT`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size INTEGER`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft'`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes TEXT`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
        ];

        for (const q of queries) {
            try {
                await client.query(q);
            } catch (e) {
                console.warn(`  ⚠ ${e.message}`);
            }
        }

        // 2. Data Migration: if file_name and url exist (old schema), move them to name and file_url
        try {
            await client.query(`UPDATE documents SET name = file_name WHERE name IS NULL AND file_name IS NOT NULL`);
            await client.query(`UPDATE documents SET file_url = url WHERE file_url IS NULL AND url IS NOT NULL`);
            await client.query(`UPDATE documents SET file_size = size WHERE file_size IS NULL AND size IS NOT NULL`);
        } catch (e) {
            console.warn(`  ⚠ Data migration skipped: ${e.message}`);
        }

        // 3. Set NOT NULL for name (after migration)
        try {
            await client.query(`ALTER TABLE documents ALTER COLUMN name SET NOT NULL`);
        } catch (e) {
            console.warn(`  ⚠ Could not set NOT NULL on name: ${e.message}`);
        }

        console.log('✅ Documents table patched successfully!');
    } catch (err) {
        console.error('❌ Patch failed:', err.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

fix();
