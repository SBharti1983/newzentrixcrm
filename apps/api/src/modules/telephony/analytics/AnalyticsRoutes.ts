/**
 * Telephony Analytics Routes
 *
 * Exposes call-quality analytics (sentiment mix, rapport/closing scores,
 * talk-time) and an agent leaderboard for the last 30 days.
 *
 * Backed by the `get_telephony_analytics(tenant_id)` stored procedure
 * (see apps/api/src/migrations/stored_procedures_v2.sql), which collapses
 * what was previously two separate queries into a single database
 * round-trip. The route is read-replica routed and Redis-cached because
 * the underlying aggregation is heavy and only needs to be fresh every
 * few minutes.
 */

import express, { Response } from 'express';
import { readDb } from '../../../db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../../../middleware/auth';
import { cacheResponse } from '../../../middleware/cache';
import { logger } from '@zentrix/logger';

const router = express.Router();
router.use(authenticateToken);

// GET /api/v1/telephony/analytics — 30-day call analytics + agent leaderboard
router.get('/', cacheResponse(180), async (req: any, res: Response) => {
    const tid = req.tenantId;

    try {
        // 🔥 SCALE-OUT: Read replica handles the analytical workload.
        // 🔥 STORED PROCEDURE: 2 queries → 1 round-trip.
        const spResult = await readDb.execute(sql`
            SELECT get_telephony_analytics(${tid}::uuid) as data
        `);

        const data = (spResult.rows[0] as any)?.data || { stats: {}, leaderboard: [] };

        res.json({
            stats: data.stats || {},
            leaderboard: data.leaderboard || []
        });
    } catch (err: any) {
        logger.error('[TELEPHONY ANALYTICS ERROR]', err);
        res.status(500).json({ error: 'Failed to load telephony analytics' });
    }
});

export default router;
