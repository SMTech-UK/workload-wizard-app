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
    const logId = await ctx.db.insert("audit_logs", {
      action: args.action,
      entityType: args.entityType,
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
      severity: args.severity || 'info',
    });

    return logId;
  },
});

// Query to get audit logs with filtering
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

    // Apply limit and get results
    const limit = args.limit || 100;
    const logs = await query.take(limit);

    // Sort by timestamp (newest first) in memory
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
});

// Query to get audit logs for a specific entity
export const getEntityLogs = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("entityType"), args.entityType))
      .filter((q) => q.eq(q.field("entityId"), args.entityId))
      .take(args.limit || 50);

    return logs.sort((a, b) => b.timestamp - a.timestamp);

    return logs;
  },
});

// Query to get user activity logs
export const getUserActivity = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("audit_logs")
      .filter((q) => q.eq(q.field("performedBy"), args.userId))
      .take(args.limit || 50);

    return logs.sort((a, b) => b.timestamp - a.timestamp);

    return logs;
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

// Query to get audit statistics
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

    // Calculate statistics
    const actionCounts: Record<string, number> = {};
    const entityTypeCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    logs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;
      severityCounts[log.severity || 'info'] = (severityCounts[log.severity || 'info'] || 0) + 1;
      userCounts[log.performedBy] = (userCounts[log.performedBy] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      actionCounts,
      entityTypeCounts,
      severityCounts,
      uniqueUsers: Object.keys(userCounts).length,
      userCounts,
    };
  },
}); 