import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 🧠 Academic Year
  academic_years: defineTable({
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    isActive: v.boolean(),
    staging: v.boolean(),
    organisationId: v.id("organisations"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    isDefaultForOrg: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_organisation", ["organisationId"]) // filter by org
    .index("by_org_status", ["organisationId", "status"]) // filter by org + status
    .index("by_status", ["status"]), // sometimes filter by status alone

  // 🏛️ Organisation
  organisations: defineTable({
    name: v.string(),
    code: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    domain: v.optional(v.string()),
    isActive: v.boolean(),
    status: v.string(), // 'active' | 'inactive' | 'suspended'
    website: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 👥 Users
  users: defineTable({
    email: v.string(),
    username: v.optional(v.string()),
    givenName: v.string(),
    familyName: v.string(),
    fullName: v.string(),
    systemRoles: v.array(v.string()), // ['sysadmin', 'developer'], etc.
    jobRole: v.optional(v.string()), // User's job role from onboarding
    department: v.optional(v.string()),
    phone: v.optional(v.string()),
    organisationId: v.id("organisations"),
    pictureUrl: v.optional(v.string()),
    subject: v.string(), // Clerk ID
    tokenIdentifier: v.optional(v.string()),
    isActive: v.boolean(),
    lastSignInAt: v.optional(v.float64()),
    onboardingCompleted: v.optional(v.boolean()),
    onboardingData: v.optional(v.any()),
    onboardingCompletedAt: v.optional(v.float64()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_subject", ["subject"]),

  // 📋 Audit Logs
  audit_logs: defineTable({
    action: v.string(), // 'create', 'update', 'delete', 'login', 'logout', 'permission_change', etc.
    entityType: v.string(), // 'user', 'organisation', 'module', 'academic_year', etc.
    entityId: v.string(), // ID of the affected entity
    entityName: v.optional(v.string()), // Human-readable name of the entity
    performedBy: v.string(), // User ID who performed the action
    performedByName: v.optional(v.string()), // Human-readable name of the user who performed the action
    organisationId: v.optional(v.id("organisations")), // Organisation context
    details: v.optional(v.string()), // Additional details about the action
    metadata: v.optional(v.string()), // JSON string for additional structured data
    ipAddress: v.optional(v.string()), // IP address of the request
    userAgent: v.optional(v.string()), // User agent of the request
    timestamp: v.float64(),
    severity: v.optional(v.string()), // 'info', 'warning', 'error', 'critical'
  }),

  // 👤 User Profile
  user_profiles: defineTable({
    userId: v.string(),
    jobTitle: v.optional(v.string()),
    specialism: v.optional(v.string()),
    organisationId: v.id("organisations"),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 🔐 Roles
  user_roles: defineTable({
    name: v.string(),
    description: v.string(),
    isDefault: v.boolean(),
    isSystem: v.boolean(),
    permissions: v.array(v.string()),
    organisationId: v.id("organisations"),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  user_role_assignments: defineTable({
    userId: v.string(),
    roleId: v.id("user_roles"),
    organisationId: v.id("organisations"),
    assignedBy: v.string(),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_user_org", ["userId", "organisationId"]),

  // 📚 Module Definitions
  modules: defineTable({
    code: v.string(),
    name: v.string(),
    organisationId: v.id("organisations"),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 🎓 Module Iterations
  module_iterations: defineTable({
    moduleId: v.id("modules"),
    academicYearId: v.id("academic_years"),
    totalHours: v.float64(),
    weeks: v.array(v.number()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 👨‍🏫 Lecturer Profiles
  lecturer_profiles: defineTable({
    fullName: v.string(),
    email: v.string(),
    contract: v.string(), // 'FT', 'PT', 'Bank'
    fte: v.float64(),
    maxTeachingHours: v.float64(),
    totalContract: v.float64(),
    organisationId: v.id("organisations"),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_organisation", ["organisationId"]),

  // 🧑‍🏫 Lecturer Instances
  lecturers: defineTable({
    profileId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
    teamId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 🧮 Module Allocations
  module_allocations: defineTable({
    staffId: v.string(),
    moduleIterationId: v.id("module_iterations"),
    type: v.string(), // 'teaching' | 'admin'
    hours: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 🏢 Admin Allocations
  admin_allocations: defineTable({
    staffId: v.string(),
    categoryId: v.string(),
    hours: v.float64(),
    academicYearId: v.id("academic_years"),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  admin_allocation_categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isDefault: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

  // 🔐 System Permissions Registry
  system_permissions: defineTable({
    id: v.string(), // e.g. 'staff.create', 'users.invite'
    group: v.string(), // e.g. 'staff', 'users', 'modules'
    description: v.string(),
    defaultRoles: v.array(v.string()), // Array of role names that get this permission by default
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_permission_id", ["id"]),

  // 🧩 System Role Templates (used as defaults when creating organisations)
  system_role_templates: defineTable({
    name: v.string(), // e.g. 'Admin', 'Manager'
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_name", ["name"]),

  // 🏢 Organisation Roles
  organisation_roles: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    organisationId: v.id("organisations"),
    isDefault: v.boolean(), // Whether this is a default role for the org
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }).index("by_organisation", ["organisationId"]),

  // 🔗 Organisation Role Permissions (Junction Table)
  // NOTE: We use `user_roles` as the single source of truth for org-scoped roles.
  organisation_role_permissions: defineTable({
    organisationId: v.id("organisations"),
    roleId: v.id("user_roles"),
    permissionId: v.string(), // FK to system_permissions.id
    isGranted: v.boolean(), // true = granted, false = explicitly denied
    isOverride: v.boolean(), // Whether this overrides the system default
    staged: v.optional(v.boolean()), // When true, represents a staged change not yet applied
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_role", ["roleId"])
    .index("by_role_permission", ["roleId", "permissionId"])
    .index("by_organisation", ["organisationId"]),

  // 🚩 Feature Flag Overrides
  featureFlagOverrides: defineTable({
    userId: v.string(),
    flagName: v.string(),
    enabled: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_user_flag", ["userId", "flagName"]),
});
