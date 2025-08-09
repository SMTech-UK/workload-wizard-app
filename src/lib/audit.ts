import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type AuditAction =
  | "user.invited"
  | "user.role_changed"
  | "permissions.updated"
  | "flags.updated";

export type AuditEvent = {
  action: AuditAction;
  actorId: string;
  organisationId?: Id<"organisations"> | string;
  success: boolean;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  meta?: Record<string, unknown>;
};

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function recordAudit(evt: AuditEvent): Promise<void> {
  const now = Date.now();
  try {
    await convex.mutation(api.audit.create, {
      action: evt.action,
      entityType: evt.entityType ?? "system",
      entityId: evt.entityId ?? "system",
      ...(evt.entityName ? { entityName: evt.entityName } : {}),
      performedBy: evt.actorId,
      ...(evt.organisationId
        ? { organisationId: evt.organisationId as Id<"organisations"> }
        : {}),
      details: evt.success ? "success" : "failure",
      ...(evt.meta ? { metadata: JSON.stringify(evt.meta) } : {}),
      severity: evt.success ? "info" : "warning",
    });
  } catch {
    // Swallow audit failures
  }
}
