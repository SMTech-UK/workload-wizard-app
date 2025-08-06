'use server';

import { currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

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

// Main audit logging function
export async function logAuditEvent(data: AuditLogData) {
  try {
    const currentUserData = await currentUser();
    const requestInfo = await getRequestInfo();

    if (!currentUserData) {
      console.warn('Audit log attempt without authenticated user:', data);
      return;
    }

    // Get user's organisation from metadata
    const organisationId = currentUserData.publicMetadata?.organisationId as string;

    // Create the audit log entry
    await convex.mutation(api.audit.create, {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      performedBy: currentUserData.id,
      performedByName: `${currentUserData.firstName || ''} ${currentUserData.lastName || ''}`.trim() || currentUserData.emailAddresses[0]?.emailAddress,
      organisationId: organisationId,
      details: data.details,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      ipAddress: requestInfo.ipAddress,
      userAgent: requestInfo.userAgent,
      severity: data.severity || 'info',
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
    action: 'permission_change',
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
}) {
  const currentUserData = await currentUser();
  
  if (!currentUserData || (currentUserData.publicMetadata?.role !== 'sysadmin' && currentUserData.publicMetadata?.role !== 'developer')) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    return await convex.query(api.audit.list, filters || {});
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
  
  if (!currentUserData || (currentUserData.publicMetadata?.role !== 'sysadmin' && currentUserData.publicMetadata?.role !== 'developer')) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    return await convex.query(api.audit.getStats, filters || {});
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    throw new Error('Failed to fetch audit statistics');
  }
} 