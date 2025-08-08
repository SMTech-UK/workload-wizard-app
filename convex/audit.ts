import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Interface for audit log entry
export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  performedBy: string;
  performedByName?: string;
  organisationId?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  details?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

// Mutation to create an audit log entry
export const create = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    entityName: v.optional(v.string()),
    performedBy: v.string(),
    performedByName: v.optional(v.string()),
    organisationId: v.optional(v.any()),
    details: v.optional(v.string()),
    metadata: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Normalize here as a safety net in case callers bypass helpers
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, '.').replace(/\.{2,}/g, '.');
    const normalizeEntity = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const normalizedAction = normalize(args.action);
    const normalizedEntityType = normalizeEntity(args.entityType);
    const logId = await ctx.db.insert("audit_logs", {
      action: normalizedAction,
      entityType: normalizedEntityType,
      entityId: args.entityId,
      entityName: args.entityName,
      performedBy: args.performedBy,
      performedByName: args.performedByName,
      organisationId: args.organisationId,
      details: args.details,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
      severity: (args.severity as any) || 'info',
    });

    return logId;
  },
});

// Query to get audit logs with filtering and pagination
export const list = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    performedBy: v.optional(v.string()),
    organisationId: v.optional(v.any()),
    action: v.optional(v.string()),
    severity: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("audit_logs")),
    search: v.optional(v.string()),
    timeRange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("audit_logs");

    // Apply filters
    if (args.entityType) {
      query = query.filter((q) => q.eq(q.field("entityType"), args.entityType));
    }
    if (args.entityId) {
      query = query.filter((q) => q.eq(q.field("entityId"), args.entityId));
    }
    if (args.performedBy) {
      query = query.filter((q) => q.eq(q.field("performedBy"), args.performedBy));
    }
    if (args.organisationId) {
      query = query.filter((q) => q.eq(q.field("organisationId"), args.organisationId));
    }
    if (args.action) {
      query = query.filter((q) => q.eq(q.field("action"), args.action));
    }
    if (args.severity) {
      query = query.filter((q) => q.eq(q.field("severity"), args.severity));
    }
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    // Apply cursor-based pagination
    const limit = args.limit || 100;
    let logs;
    
    if (args.cursor) {
      // Get the cursor document to find the timestamp
      const cursorDoc = await ctx.db.get(args.cursor);
      if (cursorDoc) {
        // Get logs with timestamp less than the cursor timestamp
        logs = await query
          .filter((q) => q.lt(q.field("timestamp"), cursorDoc.timestamp))
          .take(limit);
      } else {
        logs = await query.take(limit);
      }
    } else {
      logs = await query.take(limit);
    }

    // Sort by timestamp (newest first) in memory
    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply search filter if provided
    let filteredLogs = sortedLogs;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredLogs = sortedLogs.filter(log => 
        log.action.toLowerCase().includes(searchLower) ||
        log.entityType.toLowerCase().includes(searchLower) ||
        log.entityName?.toLowerCase().includes(searchLower) ||
        log.performedByName?.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower) ||
        log.ipAddress?.toLowerCase().includes(searchLower)
      );
    }

    return {
      logs: filteredLogs,
      hasMore: filteredLogs.length === limit,
      nextCursor: filteredLogs.length === limit ? filteredLogs[filteredLogs.length - 1]._id : null,
    };
  },
});

// Query to get audit logs for a specific entity
export const getEntityLogs = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("entityType"), args.entityType))
      .filter((q) => q.eq(q.field("entityId"), args.entityId))
      .take(args.limit || 50);

    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      logs: sortedLogs,
      hasMore: logs.length === (args.limit || 50),
      nextCursor: logs.length === (args.limit || 50) ? logs[logs.length - 1]._id : null,
    };
  },
});

// Query to get user activity logs
export const getUserActivity = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("performedBy"), args.userId))
      .take(args.limit || 50);

    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      logs: sortedLogs,
      hasMore: logs.length === (args.limit || 50),
      nextCursor: logs.length === (args.limit || 50) ? logs[logs.length - 1]._id : null,
    };
  },
});

// Query to get recent audit logs for dashboard
export const getRecentLogs = query({
  args: {
    limit: v.optional(v.number()),
    organisationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("audit_logs");

    if (args.organisationId) {
      query = query.filter((q) => q.eq(q.field("organisationId"), args.organisationId));
    }

    const logs = await query.take(args.limit || 20);

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Query to get audit statistics with improved performance
export const getStats = query({
  args: {
    organisationId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("audit_logs");

    if (args.organisationId) {
      query = query.filter((q) => q.eq(q.field("organisationId"), args.organisationId));
    }
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));
    }

    const logs = await query.collect();

    // Calculate statistics efficiently
    const actionCounts: Record<string, number> = {};
    const entityTypeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const hourlyActivity: Record<number, number> = {};

    logs.forEach((log) => {
      // Action counts
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Entity type counts
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;
      
      // Severity counts
      severityCounts[log.severity || 'info'] = (severityCounts[log.severity || 'info'] || 0) + 1;
      
      // User counts
      userCounts[log.performedBy] = (userCounts[log.performedBy] || 0) + 1;
      
      // Hourly activity (for last 24 hours)
      const logDate = new Date(log.timestamp);
      const hour = logDate.getHours();
      const day = logDate.getDate();
      const hourKey = day * 100 + hour;
      hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1;
    });

    // Get top actions and entities
    const topActions = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const topEntities = Object.entries(entityTypeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const topUsers = Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      actionCounts,
      entityTypeCounts,
      severityCounts,
      uniqueUsers: Object.keys(userCounts).length,
      userCounts,
      topActions,
      topEntities,
      topUsers,
      hourlyActivity,
      // Additional metrics
      averageLogsPerHour: logs.length / 24, // Assuming 24 hour period
      mostActiveHour: Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      criticalLogs: severityCounts['critical'] || 0,
      errorLogs: severityCounts['error'] || 0,
      warningLogs: severityCounts['warning'] || 0,
    };
  },
});

// Query to get audit logs by date range with pagination
export const getLogsByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.gte(q.field("timestamp"), args.startDate))
      .filter((q) => q.lte(q.field("timestamp"), args.endDate))
      .take(args.limit || 100);

    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      logs: sortedLogs,
      hasMore: logs.length === (args.limit || 100),
      nextCursor: logs.length === (args.limit || 100) ? logs[logs.length - 1]._id : null,
    };
  },
});

// Query to get audit logs by severity
export const getLogsBySeverity = query({
  args: {
    severity: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("severity"), args.severity))
      .take(args.limit || 100);

    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      logs: sortedLogs,
      hasMore: logs.length === (args.limit || 100),
      nextCursor: logs.length === (args.limit || 100) ? logs[logs.length - 1]._id : null,
    };
  },
});

// Query to get audit logs by action type
export const getLogsByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("action"), args.action))
      .take(args.limit || 100);

    const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      logs: sortedLogs,
      hasMore: logs.length === (args.limit || 100),
      nextCursor: logs.length === (args.limit || 100) ? logs[logs.length - 1]._id : null,
    };
  },
}); 