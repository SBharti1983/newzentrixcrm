import pool from '../db/pool';

class DistributionService {
    /**
     * Automatically assigns a lead to the best-performing available agent for a project
     */
    async distributeLead(leadId: string, projectId: string, tenantId: string, io?: any) {
        try {
            console.log(`[Distribution] Starting allocation for Lead: ${leadId}, Project: ${projectId}`);

            // 1. Find the active queue for this project
            const { rows: queues } = await pool.query(
                `SELECT * FROM distribution_queues WHERE project_id = $1 AND tenant_id = $2 AND is_active = TRUE`,
                [projectId, tenantId]
            );

            if (!queues[0]) {
                console.log(`[Distribution] No active queue found for project ${projectId}. Falling back to default tenant distribution.`);
                return await this._distributeToTenantGeneral(leadId, tenantId, io);
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

            // Clustered Offline Check: Filter to online agents across the cluster.
            // If all agents are offline, we fall back to all members to ensure assignment.
            const onlineMemberIds: string[] = [];
            if (io) {
                for (const m of members) {
                    const sockets = await io.in(`user_${m.user_id}`).fetchSockets();
                    if (sockets.length > 0) {
                        onlineMemberIds.push(m.user_id);
                    }
                }
            }

            const candidateIds = onlineMemberIds.length > 0 ? onlineMemberIds : members.map(m => m.user_id);

            // 3. Get Performance Scores from Leaderboard for these candidates
            const { rows: leaderboard } = await pool.query(`SELECT * FROM get_sales_leaderboard($1)`, [tenantId]);
            
            // Filter leaderboard to only include queue candidates
            const candidateStats = leaderboard.filter(entry => candidateIds.includes(entry.agent_id));

            let targetAgentId = candidateIds[0]; // Default to first available candidate

            if (candidateStats.length > 0) {
                // Sort by score (weighted deals + site visits)
                candidateStats.sort((a, b) => (b.performance_score || 0) - (a.performance_score || 0));
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

            // 6. Emit real-time notification to the assigned user across all nodes
            if (io) {
                const { rows: leadRows } = await pool.query('SELECT name FROM leads WHERE id = $1', [leadId]);
                const leadName = leadRows[0]?.name || 'New Lead';
                
                io.to(`user_${targetAgentId}`).emit('notification', {
                    title: '⚡ Lead Auto-Distributed',
                    message: `Lead '${leadName}' was automatically assigned to you.`,
                    bg: 'var(--navy-600)',
                    type: 'lead_assigned',
                    data: { leadId }
                });
            }

            console.log(`[Distribution] Success: Lead ${leadId} assigned to candidate ${targetAgentId} (Online: ${onlineMemberIds.includes(targetAgentId)})`);
            return targetAgentId;

        } catch (err) {
            console.error('[Distribution Error]', err);
            return null;
        }
    }

    private async _distributeToTenantGeneral(leadId: string, tenantId: string, io?: any) {
        // Fallback: Assign to the agent with the fewest active leads
        const { rows: agents } = await pool.query(`
            SELECT u.id, COUNT(l.id) as lead_count
            FROM users u
            LEFT JOIN leads l ON u.id = l.assigned_to AND l.status = 'Active'
            WHERE u.tenant_id = $1 AND u.role IN ('agent', 'sales_manager') AND u.is_active = TRUE
            GROUP BY u.id
            ORDER BY lead_count ASC
        `, [tenantId]);

        if (agents.length === 0) return null;

        // Clustered Offline Check for fallback general distribution
        const onlineAgents: any[] = [];
        if (io) {
            for (const a of agents) {
                const sockets = await io.in(`user_${a.id}`).fetchSockets();
                if (sockets.length > 0) {
                    onlineAgents.push(a);
                }
            }
        }

        const candidateAgents = onlineAgents.length > 0 ? onlineAgents : agents;
        const targetAgent = candidateAgents[0];

        if (targetAgent) {
            await pool.query(`UPDATE leads SET assigned_to = $1 WHERE id = $2`, [targetAgent.id, leadId]);
            
            if (io) {
                const { rows: leadRows } = await pool.query('SELECT name FROM leads WHERE id = $1', [leadId]);
                const leadName = leadRows[0]?.name || 'New Lead';
                
                io.to(`user_${targetAgent.id}`).emit('notification', {
                    title: '⚡ Lead Assigned (Fallback)',
                    message: `Lead '${leadName}' was assigned to you.`,
                    type: 'lead_assigned',
                    data: { leadId }
                });
            }
            return targetAgent.id;
        }
        return null;
    }
}

export default new DistributionService();
