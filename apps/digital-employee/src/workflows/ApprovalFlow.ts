import { logger } from '@zentrix/logger';

/**
 * ApprovalFlow
 * Evaluates actions needing human authorization before final execution (e.g. sending custom deals, scheduling discounts).
 */
export class ApprovalFlow {
    async requestApproval(tenantId: number, leadId: string, actionType: string, payload: any): Promise<boolean> {
        logger.info(`[ApprovalFlow] Approval requested for ${actionType} on lead ${leadId}`);
        return false; // requires human review
    }
}

const approvalFlow = new ApprovalFlow();
export default approvalFlow;
