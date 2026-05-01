import pool from '../db/pool';

class DistributionService {
    /**
     * Automatically assigns a lead to the best-performing available agent for a project
     */
    async distributeLead(leadId: string, projectId: string, tenantId: string) {
        try {
            console.log(`[Distribution] Starting allocation for Lead: ${leadId}, Project: ${projectId}`);

            // 1. Find the active queue for this project
            const { rows: queues } = await pool.query(
                `SELECT * FROM distribution_queues WHERE project_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
                [projectId, tenantId]
            );

            if (!queues[0]) {
                console.log(`[Distribution] No active queue found for project ${projectId}. Falling back to default tenant distribution.`);
                return await this._distributeToTenantGeneral(leadId, tenantId);
            }

            const queueId = queues[0].id;

            // 2. Get available members of this queue
            const { rows: members } = await pool.query(
                `SELECT user_id FROM distribution_queue_members WHERE queue_id = $1 AND is_available = TRUE`,
                [queueId]
            );

            if (members.length === 0) {
                console.warn(`[Distribution] No available agents in queue ${queueId}.`);
                return null;
            }

            const memberIds = members.map(m => m.user_id);

            // 3. Get Performance Scores from Leaderboard for these members
            // We'll call the SP we created earlier
            const { rows: leaderboard } = await pool.query(`SELECT * FROM get_sales_leaderboard($1)`, [tenantId]);
            
            // Filter leaderboard to only include queue members
            const candidateStats = leaderboard.filter(entry => memberIds.includes(entry.agent_id));

            let targetAgentId = memberIds[0]; // Default to first available

            if (candidateStats.length > 0) {
                // Sort by score (which is weighted deals + site visits in our SP)
                candidateStats.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
                
                // PERFORMANCE-WEIGHTED LOGIC: 
                // We pick the top performer, but to avoid overloading, we could also factor in 'last_assigned_at'
                // For now, let's pick the best performer who isn't the absolute last assigned
                targetAgentId = candidateStats[0].agent_id;
            }

            // 4. Update the Lead
            await pool.query(
                `UPDATE leads SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
                [targetAgentId, leadId]
            );

            // 5. Update Queue Meta
            await pool.query(
                `UPDATE distribution_queues SET last_assigned_user_id = $1 WHERE id = $2`,
                [targetAgentId, queueId]
            );
            await pool.query(
                `UPDATE distribution_queue_members SET last_assigned_at = NOW() WHERE queue_id = $1 AND user_id = $2`,
                [queueId, targetAgentId]
            );

            console.log(`[Distribution] Success: Lead ${leadId} assigned to Top Performer ${targetAgentId}`);
            return targetAgentId;

        } catch (err) {
            console.error('[Distribution Error]', err);
            return null;
        }
    }

    private async _distributeToTenantGeneral(leadId: string, tenantId: string) {
        // Fallback: Assign to the agent with the fewest active leads
        const { rows } = await pool.query(`
            SELECT u.id, COUNT(l.id) as lead_count
            FROM users u
            LEFT JOIN leads l ON u.id = l.assigned_to AND l.status = 'Active'
            WHERE u.tenant_id = $1 AND u.role IN ('agent', 'sales_manager') AND u.is_active = TRUE
            GROUP BY u.id
            ORDER BY lead_count ASC
            LIMIT 1
        `, [tenantId]);

        if (rows[0]) {
            await pool.query(`UPDATE leads SET assigned_to = $1 WHERE id = $2`, [rows[0].id, leadId]);
            return rows[0].id;
        }
        return null;
    }
}

export default new DistributionService();
