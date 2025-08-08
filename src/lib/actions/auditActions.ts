'use server';

import { currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { hasAdminAccess } from '@/lib/auth/permissions';

// Initialize Convex client for server actions
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

// Helper function to get request information
async function getRequestInfo() {
  const headersList = await headers();
  return {
    ipAddress: headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown',
    userAgent: headersList.get('user-agent') || 'unknown',
  };
}

function normalizeAction(value: string): string {
  // Convert spaces/underscores/hyphens to dots, lowercase
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '.')
    .replace(/\.{2,}/g, '.');
}

function normalizeEntityType(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeSeverity(value?: string): 'info' | 'warning' | 'error' | 'critical' {
  const v = (value || 'info').toLowerCase() as 'info' | 'warning' | 'error' | 'critical';
  const allowed: Array<'info' | 'warning' | 'error' | 'critical'> = ['info', 'warning', 'error', 'critical'];
  return allowed.includes(v) ? v : 'info';
}

function safeStringify(obj?: Record<string, unknown>): string | undefined {
  if (!obj) return undefined;
  try {
    // Stable stringify by sorting keys for readability/diffs
    const ordered = Object.keys(obj)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = obj[key];
        return acc;
      }, {});
    return JSON.stringify(ordered);
  } catch {
    return undefined;
  }
}

// Main audit logging function
export async function logAuditEvent(data: AuditLogData) {
  try {
    const currentUserData = await currentUser();
    const requestInfo = await getRequestInfo();

    if (!currentUserData) {
      console.warn('Audit log attempt without authenticated user:', data);
      return;
    }

    // Normalize core fields
    const action = normalizeAction(data.action);
    const entityType = normalizeEntityType(data.entityType);
    const severity = normalizeSeverity(data.severity);
    const organisationId = currentUserData.publicMetadata?.organisationId as string;

    // Create the audit log entry
    await convex.mutation(api.audit.create, {
      action,
      entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      performedBy: currentUserData.id,
      performedByName: `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || currentUserData.emailAddresses[0]?.emailAddress,
      organisationId: organisationId,
      details: data.details,
      metadata: safeStringify(data.metadata),
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      severity,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Convenience functions for common audit events
export async function logUserCreated(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'create',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User account created',
    severity: 'info',
  });
}

export async function logUserDeleted(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'delete',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User account deleted',
    severity: 'warning',
  });
}

export async function logUserUpdated(userId: string, userEmail: string, changes: Record<string, unknown>, details?: string) {
  await logAuditEvent({
    action: 'update',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User account updated',
    metadata: { changes },
    severity: 'info',
  });
}

export async function logUserLogin(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'login',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User logged in',
    severity: 'info',
  });
}

export async function logUserLogout(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'logout',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User logged out',
    severity: 'info',
  });
}

export async function logPermissionChange(userId: string, userEmail: string, oldRole: string, newRole: string, details?: string) {
  await logAuditEvent({
    action: 'permission.change',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || `User role changed from ${oldRole} to ${newRole}`,
    metadata: { oldRole, newRole },
    severity: 'warning',
  });
}

export async function logOrganisationCreated(orgId: string, orgName: string, details?: string) {
  await logAuditEvent({
    action: 'create',
    entityType: 'organisation',
    entityId: orgId,
    entityName: orgName,
    details: details || 'Organisation created',
    severity: 'info',
  });
}

export async function logOrganisationUpdated(orgId: string, orgName: string, changes: Record<string, unknown>, details?: string) {
  await logAuditEvent({
    action: 'update',
    entityType: 'organisation',
    entityId: orgId,
    entityName: orgName,
    details: details || 'Organisation updated',
    metadata: { changes },
    severity: 'info',
  });
}

export async function logModuleCreated(moduleId: string, moduleName: string, details?: string) {
  await logAuditEvent({
    action: 'create',
    entityType: 'module',
    entityId: moduleId,
    entityName: moduleName,
    details: details || 'Module created',
    severity: 'info',
  });
}

export async function logModuleUpdated(moduleId: string, moduleName: string, changes: Record<string, unknown>, details?: string) {
  await logAuditEvent({
    action: 'update',
    entityType: 'module',
    entityId: moduleId,
    entityName: moduleName,
    details: details || 'Module updated',
    metadata: { changes },
    severity: 'info',
  });
}

export async function logModuleDeleted(moduleId: string, moduleName: string, details?: string) {
  await logAuditEvent({
    action: 'delete',
    entityType: 'module',
    entityId: moduleId,
    entityName: moduleName,
    details: details || 'Module deleted',
    severity: 'warning',
  });
}

export async function logAcademicYearCreated(yearId: string, yearName: string, details?: string) {
  await logAuditEvent({
    action: 'create',
    entityType: 'academic_year',
    entityId: yearId,
    entityName: yearName,
    details: details || 'Academic year created',
    severity: 'info',
  });
}

export async function logAcademicYearUpdated(yearId: string, yearName: string, changes: Record<string, unknown>, details?: string) {
  await logAuditEvent({
    action: 'update',
    entityType: 'academic_year',
    entityId: yearId,
    entityName: yearName,
    details: details || 'Academic year updated',
    metadata: { changes },
    severity: 'info',
  });
}

export async function logError(error: Error, context: string, entityType?: string, entityId?: string) {
  await logAuditEvent({
    action: 'error',
    entityType: entityType || 'system',
    entityId: entityId || 'unknown',
    details: `Error in ${context}: ${error.message}`,
    metadata: { 
      errorName: error.name,
      errorStack: error.stack,
      context 
    },
    severity: 'error',
  });
}

// Permission-related audit functions
export async function logPermissionCreated(permissionId: string, permissionName: string, details?: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'create',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `System permission "${permissionName}" created`,
    metadata,
    severity: 'info',
  });
}

export async function logPermissionUpdated(permissionId: string, permissionName: string, changes: Record<string, unknown>, details?: string) {
  await logAuditEvent({
    action: 'update',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `System permission "${permissionName}" updated`,
    metadata: { changes },
    severity: 'info',
  });
}

export async function logPermissionDeleted(permissionId: string, permissionName: string, details?: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'delete',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `System permission "${permissionName}" deleted`,
    metadata,
    severity: 'warning',
  });
}

export async function logPermissionAssigned(permissionId: string, permissionName: string, roleId: string, roleName: string, details?: string) {
  await logAuditEvent({
    action: 'permission.assigned',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `Permission "${permissionName}" assigned to role "${roleName}"`,
    metadata: { 
      roleId,
      roleName,
      permissionId,
      permissionName 
    },
    severity: 'info',
  });
}

export async function logPermissionRevoked(permissionId: string, permissionName: string, roleId: string, roleName: string, details?: string) {
  await logAuditEvent({
    action: 'permission.revoked',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `Permission "${permissionName}" revoked from role "${roleName}"`,
    metadata: { 
      roleId,
      roleName,
      permissionId,
      permissionName 
    },
    severity: 'warning',
  });
}

export async function logPermissionPushedToOrgs(permissionId: string, permissionName: string, results: { organisationsUpdated: number; assignmentsCreated: number; }, details?: string) {
  await logAuditEvent({
    action: 'permission.pushed',
    entityType: 'permission',
    entityId: permissionId,
    entityName: permissionName,
    details: details || `Permission "${permissionName}" pushed to ${results.organisationsUpdated} organisation(s), creating ${results.assignmentsCreated} new assignment(s)`,
    metadata: results,
    severity: 'info',
  });
}

// Role-related audit functions
export async function logRoleCreated(roleId: string, roleName: string, organisationId?: string, details?: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'role.created',
    entityType: 'role',
    entityId: roleId,
    entityName: roleName,
    details: details || `Role "${roleName}" created`,
    metadata: { organisationId, ...metadata },
    severity: 'info',
  });
}

export async function logRoleUpdated(roleId: string, roleName: string, changes: Record<string, unknown>, organisationId?: string, details?: string) {
  await logAuditEvent({
    action: 'role.updated',
    entityType: 'role',
    entityId: roleId,
    entityName: roleName,
    details: details || `Role "${roleName}" updated`,
    metadata: { organisationId, changes },
    severity: 'info',
  });
}

export async function logRoleDeleted(roleId: string, roleName: string, organisationId?: string, details?: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'role.deleted',
    entityType: 'role',
    entityId: roleId,
    entityName: roleName,
    details: details || `Role "${roleName}" deleted`,
    metadata: { organisationId, ...metadata },
    severity: 'warning',
  });
}

// Assignment audit helpers
export async function logRoleAssignedToUser(userId: string, userEmailOrName: string | undefined, roleName: string, scope: 'system' | 'organisation', extra?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'role.assigned',
    entityType: 'user',
    entityId: userId,
    entityName: userEmailOrName,
    details: `Role assigned: ${roleName} (${scope})`,
    metadata: { roleName, scope, ...extra },
    severity: 'info',
  });
}

export async function logRoleRevokedFromUser(userId: string, userEmailOrName: string | undefined, roleName: string, scope: 'system' | 'organisation', extra?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'role.revoked',
    entityType: 'user',
    entityId: userId,
    entityName: userEmailOrName,
    details: `Role revoked: ${roleName} (${scope})`,
    metadata: { roleName, scope, ...extra },
    severity: 'warning',
  });
}

// Function to get audit logs (for admin interface)
export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  organisationId?: string;
  action?: string;
  severity?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  cursor?: string;
}) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has admin role in Clerk metadata - support both old and new format
  const userRoles = currentUserData.publicMetadata?.roles as string[] || [];
  const userRole = currentUserData.publicMetadata?.role as string;
  
  // Add legacy role to roles array if it exists
  if (userRole && !userRoles.includes(userRole)) {
    userRoles.push(userRole);
  }
  
  if (!hasAdminAccess(userRole) && !(userRoles.includes('sysadmin') || userRoles.includes('developer'))) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Drop cursor here (typed as Convex Id on server). Client can manage paging with returned nextCursor
    const { cursor: _cursor, ...rest } = filters || {};
    const result = await convex.query(api.audit.list, rest as any);
    return result; // Return the full response object with logs, hasMore, and nextCursor
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}

// Function to get audit statistics
export async function getAuditStats(filters?: {
  organisationId?: string;
  startDate?: number;
  endDate?: number;
}) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has admin role in Clerk metadata - support both old and new format
  const userRoles = currentUserData.publicMetadata?.roles as string[] || [];
  const userRole = currentUserData.publicMetadata?.role as string;
  
  // Add legacy role to roles array if it exists
  if (userRole && !userRoles.includes(userRole)) {
    userRoles.push(userRole);
  }
  
  const hasAdminAccess = userRoles.includes('sysadmin') || userRoles.includes('developer');
  
  if (!hasAdminAccess) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    return await convex.query(api.audit.getStats, filters || {});
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    throw new Error('Failed to fetch audit statistics');
  }
} 

// User deactivation/reactivation audit functions
export async function logUserDeactivated(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'deactivate',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User account deactivated',
    severity: 'warning',
  });
}

export async function logUserReactivated(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'reactivate',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User account reactivated',
    severity: 'info',
  });
}

export async function logUserPasswordReset(userId: string, userEmail: string, details?: string) {
  await logAuditEvent({
    action: 'password_reset',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || 'User password reset',
    severity: 'warning',
  });
}

export async function logUserEmailUpdated(userId: string, oldEmail: string, newEmail: string, details?: string) {
  await logAuditEvent({
    action: 'email_update',
    entityType: 'user',
    entityId: userId,
    entityName: newEmail,
    details: details || `User email updated from ${oldEmail} to ${newEmail}`,
    metadata: { oldEmail, newEmail },
    severity: 'info',
  });
}

// Organisation audit functions
export async function logOrganisationDeleted(orgId: string, orgName: string, details?: string) {
  await logAuditEvent({
    action: 'delete',
    entityType: 'organisation',
    entityId: orgId,
    entityName: orgName,
    details: details || 'Organisation deleted',
    severity: 'critical',
  });
}

export async function logOrganisationStatusChanged(orgId: string, orgName: string, oldStatus: string, newStatus: string, details?: string) {
  await logAuditEvent({
    action: 'status_change',
    entityType: 'organisation',
    entityId: orgId,
    entityName: orgName,
    details: details || `Organisation status changed from ${oldStatus} to ${newStatus}`,
    metadata: { oldStatus, newStatus },
    severity: 'warning',
  });
}



// Academic year audit functions
export async function logAcademicYearDeleted(yearId: string, yearName: string, details?: string) {
  await logAuditEvent({
    action: 'delete',
    entityType: 'academic_year',
    entityId: yearId,
    entityName: yearName,
    details: details || 'Academic year deleted',
    severity: 'warning',
  });
}

export async function logAcademicYearStatusChanged(yearId: string, yearName: string, oldStatus: boolean, newStatus: boolean, details?: string) {
  await logAuditEvent({
    action: 'status_change',
    entityType: 'academic_year',
    entityId: yearId,
    entityName: yearName,
    details: details || `Academic year ${newStatus ? 'activated' : 'deactivated'}`,
    metadata: { oldStatus, newStatus },
    severity: 'info',
  });
}

// System audit functions
export async function logSystemMaintenance(action: string, details?: string, metadata?: Record<string, unknown>) {
  await logAuditEvent({
    action: 'maintenance',
    entityType: 'system',
    entityId: 'system',
    entityName: 'System',
    details: details || `System maintenance: ${action}`,
    metadata,
    severity: 'info',
  });
}

export async function logDataExport(userId: string, userEmail: string, exportType: string, recordCount: number, details?: string) {
  await logAuditEvent({
    action: 'data_export',
    entityType: 'system',
    entityId: 'export',
    entityName: `${exportType} Export`,
    details: details || `Data export: ${exportType} (${recordCount} records)`,
    metadata: { exportType, recordCount },
    severity: 'info',
  });
}

export async function logDataImport(userId: string, userEmail: string, importType: string, recordCount: number, details?: string) {
  await logAuditEvent({
    action: 'data_import',
    entityType: 'system',
    entityId: 'import',
    entityName: `${importType} Import`,
    details: details || `Data import: ${importType} (${recordCount} records)`,
    metadata: { importType, recordCount },
    severity: 'info',
  });
}

// Security audit functions
export async function logFailedLogin(userId: string, userEmail: string, reason: string, details?: string) {
  await logAuditEvent({
    action: 'login_failed',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || `Failed login attempt: ${reason}`,
    metadata: { reason },
    severity: 'warning',
  });
}

export async function logAccountLocked(userId: string, userEmail: string, reason: string, details?: string) {
  await logAuditEvent({
    action: 'account_locked',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || `Account locked: ${reason}`,
    metadata: { reason },
    severity: 'error',
  });
}

export async function logSuspiciousActivity(userId: string, userEmail: string, activity: string, details?: string) {
  await logAuditEvent({
    action: 'suspicious_activity',
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
    details: details || `Suspicious activity detected: ${activity}`,
    metadata: { activity },
    severity: 'error',
  });
} 