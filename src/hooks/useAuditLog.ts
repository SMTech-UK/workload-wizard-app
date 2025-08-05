'use client';

import { useCallback } from 'react';
import { logAuditEvent } from '@/lib/actions/auditActions';

export interface UseAuditLogOptions {
  entityType: string;
  entityId: string;
  entityName?: string;
}

export function useAuditLog(options: UseAuditLogOptions) {
  const { entityType, entityId, entityName } = options;

  const logAction = useCallback(async (
    action: string,
    details?: string,
    metadata?: Record<string, unknown>,
    severity?: 'info' | 'warning' | 'error' | 'critical'
  ) => {
    try {
      await logAuditEvent({
        action,
        entityType,
        entityId,
        entityName,
        details,
        metadata,
        severity,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }, [entityType, entityId, entityName]);

  const logCreate = useCallback((details?: string, metadata?: Record<string, unknown>) => {
    return logAction('create', details, metadata, 'info');
  }, [logAction]);

  const logUpdate = useCallback((changes: Record<string, unknown>, details?: string) => {
    return logAction('update', details, { changes }, 'info');
  }, [logAction]);

  const logDelete = useCallback((details?: string, metadata?: Record<string, unknown>) => {
    return logAction('delete', details, metadata, 'warning');
  }, [logAction]);

  const logError = useCallback((error: Error, context: string) => {
    return logAction('error', `Error in ${context}: ${error.message}`, {
      errorName: error.name,
      errorStack: error.stack,
      context,
    }, 'error');
  }, [logAction]);

  return {
    logAction,
    logCreate,
    logUpdate,
    logDelete,
    logError,
  };
} 