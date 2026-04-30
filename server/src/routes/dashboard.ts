import express, { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { cacheResponse } from '../middleware/cache';
import fs from 'fs';

const router = express.Router();
router.use(authenticateToken);

// GET /api/dashboard — all KPIs in one call via Stored Procedure
router.get('/', cacheResponse(300), async (req: any, res: Response) => {
    const tid = req.tenantId;
    const uid = req.user.id;
    const isManager = ['admin', 'sales_manager', 'team_leader'].includes(req.user.role);
    const filterPersonal = req.query.personal === 'true' || req.user.role === 'agent';

    try {
        // 1. Get downline user IDs for hierarchy filtering
        let downlineIds: string[] = [];
        if (req.user.role === 'team_leader') {
            const agents = await db.execute(sql`SELECT id FROM users WHERE reports_to = ${uid}`);
            downlineIds = [uid, ...agents.rows.map((a: any) => a.id)];
        } else if (req.user.role === 'sales_manager') {
            const members = await db.execute(sql`
                SELECT id FROM users WHERE reports_to = ${uid}
                UNION
                SELECT id FROM users WHERE reports_to IN (SELECT id FROM users WHERE reports_to = ${uid})
            `);
            downlineIds = [uid, ...members.rows.map((m: any) => m.id)];
        }
        
        const targetUserId = (isManager && req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null') ? req.query.member_id : uid;
        const effectivePersonal = filterPersonal || (req.query.member_id && req.query.member_id !== 'undefined' && req.query.member_id !== 'null');

        // Access check for impersonation
        if (targetUserId !== uid && req.user.role !== 'admin') {
            if (!downlineIds.includes(targetUserId as string)) {
                return res.status(403).json({ error: 'Access denied: User is not in your downline' });
            }
        }

        const downlineArrayStr = `{${downlineIds.join(',')}}`;

        // 🔥 STORED PROCEDURE: Single database round-trip replaces 14 parallel queries
        const spResult = await db.execute(sql`
            SELECT get_dashboard_kpis(
                ${tid}::uuid,
                ${targetUserId}::uuid,
                ${effectivePersonal}::boolean,
                ${downlineArrayStr}::uuid[]
            ) as data
        `);

        const dashboardData = (spResult.rows[0] as any)?.data || {};

        // 🔥 STORED PROCEDURE: Supplementary Data (Heatmaps, Team, Academy)
        const spSuppResult = await db.execute(sql`
            SELECT get_dashboard_supplementary(
                ${tid}::uuid,
                ${targetUserId}::uuid,
                ${downlineArrayStr}::uuid[],
                ${effectivePersonal}::boolean
            ) as supp_data
        `);

        const suppData = (spSuppResult.rows[0] as any)?.supp_data || {};

        res.json({
            meta: {
                view: effectivePersonal ? 'personal' : 'global',
                is_manager: isManager,
                user_id: targetUserId,
                is_impersonating: targetUserId !== uid
            },
            // From Stored Procedure 1 (KPIs)
            ...dashboardData,
            // From Stored Procedure 2 (Supplementary)
            heatmap: suppData.heatmap || { projects: [], agents: [] },
            assigned_team: suppData.assigned_team || [],
            academy: suppData.academy || { total_xp: 0, level: 1, certifications: 0, avg_sim_score: 0 },
            members: suppData.members || []
        });
    } catch (err: any) {
        fs.appendFileSync('dash_real_error.txt', err.toString() + '\n' + (err.stack || '') + '\n\n');
        console.error('[DASHBOARD ERROR]', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

export default router;
