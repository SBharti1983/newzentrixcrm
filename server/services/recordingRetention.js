const pool = require('../db/pool');

/**
 * Recording Retention Service
 * 
 * Automatically cleans up call recordings older than the retention period (default: 30 days).
 * 
 * WHAT STAYS FOREVER:
 *   ✅ Transcript text (interactions.transcript)
 *   ✅ Sentiment & summary (interactions.sentiment, interactions.note)
 *   ✅ Timeline entry, .txt download
 * 
 * WHAT GETS DELETED AFTER 30 DAYS:
 *   🗑️ Audio file from Firebase Storage
 *   🗑️ recording_url cleared from database
 *   🗑️ "Listen" button disappears from timeline
 */

const RETENTION_DAYS = 30;
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // Run every 12 hours

let cleanupTimer = null;

/**
 * Runs the cleanup job:
 * 1. Finds all interactions with recording_url older than RETENTION_DAYS
 * 2. Deletes the file from Firebase Storage (if configured)
 * 3. Clears recording_url from the database
 * 4. Leaves transcript, sentiment, notes untouched
 */
async function runCleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(`[RecordingRetention] Starting cleanup for recordings older than ${RETENTION_DAYS} days (before ${cutoffDate.toISOString()})...`);

    try {
        // Find expired recordings
        const result = await pool.query(`
            SELECT id, recording_url, tenant_id, date 
            FROM interactions 
            WHERE recording_url IS NOT NULL 
              AND recording_url != '' 
              AND date < $1
            ORDER BY date ASC
            LIMIT 100
        `, [cutoffDate]);

        if (result.rows.length === 0) {
            console.log('[RecordingRetention] No expired recordings found. All clean.');
            return { deleted: 0, errors: 0 };
        }

        console.log(`[RecordingRetention] Found ${result.rows.length} expired recordings to clean up.`);

        let deleted = 0;
        let errors = 0;

        for (const row of result.rows) {
            try {
                // Attempt to delete from Firebase Storage
                if (row.recording_url.includes('storage.googleapis.com') || 
                    row.recording_url.includes('firebasestorage.googleapis.com')) {
                    try {
                        const { bucket, isStorageEnabled } = require('../utils/firebase');
                        if (isStorageEnabled && bucket) {
                            // Extract file path from URL
                            // URL format: https://storage.googleapis.com/BUCKET/recordings/tenant/2026-04/file.mp4
                            const urlParts = new URL(row.recording_url);
                            const filePath = decodeURIComponent(urlParts.pathname)
                                .replace(`/${bucket.name}/`, '');
                            
                            if (filePath && filePath.startsWith('recordings/')) {
                                await bucket.file(filePath).delete();
                                console.log(`[RecordingRetention] 🗑️ Firebase file deleted: ${filePath}`);
                            }
                        }
                    } catch (storageErr) {
                        // Don't block DB cleanup if storage delete fails
                        console.warn(`[RecordingRetention] Storage delete failed for ${row.id}: ${storageErr.message}`);
                    }
                }

                // Clear recording_url from database (transcript stays!)
                await pool.query(`
                    UPDATE interactions 
                    SET recording_url = NULL, 
                        note = CASE 
                            WHEN note LIKE '%Recording Link:%' 
                            THEN regexp_replace(note, E'\\nRecording Link:.*$', E'\n[Recording expired after ${RETENTION_DAYS} days]')
                            ELSE note 
                        END,
                        updated_at = NOW()
                    WHERE id = $1
                `, [row.id]);

                deleted++;
                const ageDays = Math.floor((Date.now() - new Date(row.date).getTime()) / (1000 * 60 * 60 * 24));
                console.log(`[RecordingRetention] ✅ Cleaned interaction ${row.id} (${ageDays} days old)`);

            } catch (rowErr) {
                errors++;
                console.error(`[RecordingRetention] ❌ Failed to clean ${row.id}:`, rowErr.message);
            }
        }

        console.log(`[RecordingRetention] Cleanup complete: ${deleted} deleted, ${errors} errors.`);
        return { deleted, errors };

    } catch (err) {
        console.error('[RecordingRetention] Cleanup job failed:', err.message);
        return { deleted: 0, errors: 1 };
    }
}

/**
 * Starts the retention scheduler. Runs immediately on startup, then every 12 hours.
 */
function startRetentionScheduler() {
    console.log(`⏰ Recording retention scheduler started (${RETENTION_DAYS}-day policy, checks every 12h)`);
    
    // Run first cleanup after a 60-second startup delay (let DB connect first)
    setTimeout(() => {
        runCleanup().catch(err => console.error('[RecordingRetention] Initial run failed:', err.message));
    }, 60000);

    // Then run every 12 hours
    cleanupTimer = setInterval(() => {
        runCleanup().catch(err => console.error('[RecordingRetention] Scheduled run failed:', err.message));
    }, CHECK_INTERVAL_MS);
}

/**
 * Stops the retention scheduler.
 */
function stopRetentionScheduler() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        console.log('[RecordingRetention] Scheduler stopped.');
    }
}

module.exports = {
    runCleanup,
    startRetentionScheduler,
    stopRetentionScheduler,
    RETENTION_DAYS
};
