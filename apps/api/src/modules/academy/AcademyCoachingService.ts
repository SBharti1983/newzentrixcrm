import pool from '../../db/pool';

class AcademyCoachingService {
    /**
     * Audit agent performance and auto-assign training modules
     * @param tenantId The organization to audit
     */
    async runPerformanceAudit(tenantId: string) {
        console.log(`[Academy Coaching] Starting performance audit for tenant: ${tenantId}`);

        try {
            // 1. Get average scores for all agents in the last 30 days
            // Skills: 'rapport_score', 'closing_score' (from interaction metadata)
            const { rows: agents } = await pool.query(
                `SELECT 
                    created_by as user_id,
                    AVG((metadata->>'rapportScore')::numeric) as avg_rapport,
                    AVG((metadata->>'closingScore')::numeric) as avg_closing
                 FROM interactions
                 WHERE tenant_id = $1 
                 AND created_at > NOW() - INTERVAL '30 days'
                 AND metadata->>'rapportScore' IS NOT NULL
                 GROUP BY created_by`,
                [tenantId]
            );

            for (const agent of agents) {
                // Audit Rapport
                if (parseFloat(agent.avg_rapport) < 6) {
                    await this.assignRemedialModule(tenantId, agent.user_id, 'Rapport', agent.avg_rapport);
                }
                // Audit Closing
                if (parseFloat(agent.avg_closing) < 6) {
                    await this.assignRemedialModule(tenantId, agent.user_id, 'Closing', agent.avg_closing);
                }
            }

            return { success: true, agentsAudited: agents.length };
        } catch (err) {
            console.error('[Academy Coaching] Audit failed:', err);
            throw err;
        }
    }

    private async assignRemedialModule(tenantId: string, userId: string, skill: string, avgScore: number) {
        // Find a module for this skill
        const { rows: modules } = await pool.query(
            "SELECT id, title FROM training_modules WHERE target_skill = $1 AND tenant_id = $2 AND is_active = true LIMIT 1",
            [skill, tenantId]
        );

        if (modules.length === 0) return;

        const module = modules[0];

        // Check if already assigned
        const { rows: existing } = await pool.query(
            "SELECT id FROM training_progress WHERE user_id = $1 AND module_id = $2",
            [userId, module.id]
        );

        if (existing.length === 0) {
            console.log(`[Academy Coaching] Auto-assigning module "${module.title}" to user ${userId} due to low ${skill} score (${avgScore})`);
            
            await pool.query(
                "INSERT INTO training_progress (tenant_id, user_id, module_id, status) VALUES ($1, $2, $3, 'Not Started')",
                [tenantId, userId, module.id]
            );

            // Log the intervention
            await pool.query(
                "INSERT INTO academy_coaching_logs (tenant_id, user_id, module_id, detected_weakness, avg_score) VALUES ($1, $2, $3, $4, $5)",
                [tenantId, userId, module.id, skill, avgScore]
            );

            // Trigger notification
            await pool.query(
                `INSERT INTO notifications (tenant_id, user_id, title, message, type)
                 VALUES ($1, $2, $3, $4, 'Academy')`,
                [tenantId, userId, 'New Coaching Assigned', `Based on your recent call analysis, we've assigned "${module.title}" to help you improve your ${skill} skills.`]
            );
        }
    }
}

export default new AcademyCoachingService();
