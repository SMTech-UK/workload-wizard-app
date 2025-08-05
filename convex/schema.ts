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
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

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
    givenName: v.string(),
    familyName: v.string(),
    fullName: v.string(),
    systemRole: v.string(), // 'admin', etc.
    organisationId: v.id("organisations"),
    pictureUrl: v.optional(v.string()),
    subject: v.string(), // Clerk ID
    tokenIdentifier: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  }),

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
  }),

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
  }),

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

});
