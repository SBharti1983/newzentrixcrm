import { logger } from '@zentrix/logger';

/**
 * TaskManager
 * Tracks asynchronous processing tasks assigned to digital employees (e.g. data syncing, RAG builds).
 */
export class TaskManager {
    async createTask(tenantId: number, taskName: string, payload: any): Promise<string> {
        logger.info(`[TaskManager] Task ${taskName} registered for tenant ${tenantId}`);
        return `task-${Date.now()}`;
    }
}

const taskManager = new TaskManager();
export default taskManager;
