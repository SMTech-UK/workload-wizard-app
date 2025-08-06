// 🧠 Academic Year
export interface AcademicYear {
    id: string;
    name: string;               // e.g. "2025-2026"
    startDate: string;          // ISO 8601
    endDate: string;
    isActive: boolean;
    staging: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🏛️ Organisation
  export interface Organisation {
    id: string;
    name: string;
    code: string;
    contactEmail?: string;
    contactPhone?: string;
    domain?: string;
    isActive: boolean;
    status: 'active' | 'inactive' | 'suspended';
    website?: string;
    createdAt: number;
    updatedAt: number;
  }
  
  // 👥 User (Core Identity)
  export interface User {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
    fullName: string;
    systemRole: 'orgadmin' | 'sysadmin' | 'developer' | 'user' | 'trial';
    organisationId: string;
    pictureUrl?: string;
    subject: string;               // Clerk identifier
    tokenIdentifier?: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 👤 User Profile (Extended Data)
  export interface UserProfile {
    id: string;
    userId: string;
    jobTitle?: string;
    specialism?: string;
    organisationId: string;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🔐 Role & Assignment
  export interface UserRole {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
    isSystem: boolean;
    permissions: string[];
    organisationId: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  export interface UserRoleAssignment {
    id: string;
    userId: string;
    roleId: string;
    organisationId: string;
    assignedBy: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 📚 Module Definition (global)
  export interface Module {
    id: string;
    code: string;
    name: string;
    organisationId: string;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🎓 Module Iteration (year-specific)
  export interface ModuleIteration {
    id: string;
    moduleId: string;
    academicYearId: string;
    totalHours: number;
    weeks: number[];
    createdAt: number;
    updatedAt: number;
  }
  
  // 👨‍🏫 Lecturer Profile (global)
  export interface LecturerProfile {
    id: string;
    fullName: string;
    email: string;
    contract: 'FT' | 'PT' | 'Bank';
    fte: number;
    maxTeachingHours: number;
    totalContract: number;
    organisationId: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🧑‍🏫 Lecturer Instance (year-specific)
  export interface Lecturer {
    id: string;
    profileId: string;
    academicYearId: string;
    teamId?: string;
    isActive: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🧮 Module Allocation (staff ↔ module)
  export interface ModuleAllocation {
    id: string;
    staffId: string;
    moduleIterationId: string;
    type: 'teaching' | 'admin';
    hours: number;
    createdAt: number;
    updatedAt: number;
  }
  
  // 🏢 Admin Allocation
  export interface AdminAllocation {
    id: string;
    staffId: string;
    categoryId: string;
    hours: number;
    academicYearId: string;
    createdAt: number;
    updatedAt: number;
  }
  
  export interface AdminAllocationCategory {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    createdAt: number;
    updatedAt: number;
  }
  
  // 📝 Audit Log
  export interface AuditLog {
    id: string;
    userId: string;
    action: 'create' | 'update' | 'delete';
    entityId: string;
    entityType: string;
    changes: Record<string, unknown>;
    ipAddress: string;
    userAgent: string;
    organisationId?: string;
    createdAt: number;
  }
  
  export type AllocationType = 'teaching' | 'admin';

  export interface StaffWorkloadSummary {
    staffId: string;
    teachingHours: number;
    adminHours: number;
    totalHours: number;
    remaining: number;
    overload: boolean;
  }
  