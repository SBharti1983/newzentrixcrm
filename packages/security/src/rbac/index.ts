/**
 * Role-Based Access Control (RBAC) definitions and helpers
 */

export const ROLE_HIERARCHY: Record<string, string[]> = {
    superadmin: ['admin', 'sales_manager', 'team_leader', 'agent', 'customer', 'broker'],
    admin: ['sales_manager', 'team_leader', 'agent', 'customer', 'broker'],
    sales_manager: ['team_leader', 'agent'],
    team_leader: ['agent'],
    agent: [],
    customer: [],
    broker: []
};

/**
 * Checks if a user role matches or inherits from a target role.
 */
export function hasRole(userRole: string, targetRole: string): boolean {
    if (userRole === targetRole) {
        return true;
    }
    const inherited = ROLE_HIERARCHY[userRole] || [];
    return inherited.includes(targetRole);
}

/**
 * Matches permission array against target permission keys.
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
}
