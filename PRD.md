# 📄 **Product Requirements Document (PRD) — WorkloadWizard MVP**

## 1. **Purpose**

WorkloadWizard is a **multi-tenant, role-based academic workload management web app**.
It replaces spreadsheet-based workload planning for universities by allowing:

- **Organisation-wide setup** (courses, academic years, modules, groups)
- **Teaching & admin hour allocation** to lecturers
- **Capacity tracking** against contractual limits
- **Draft vs Published** year planning for safe future-year preparation

The MVP is designed to be **flexible** for other organisations while **mirroring current workflows** at the alpha test institution.

---

## 2. **Goals for MVP**

- **Enable workload planning for a single academic year per organisation**
- Allow **parallel work** on future academic years without affecting the current year
- Support **roles & permissions** for system-wide and organisation-specific actions
- Provide a **clear allocation & hours calculation** workflow:
  - Academic year → Course → Year → Module → Module Iteration (per AY) → Groups → Lecturer Allocation

- Track lecturer capacity vs contract

---

## 3. **Non-Goals for MVP**

- Automatic cohort splitting into groups (manual entry for MVP)
- Full timetable clash detection
- Advanced analytics or export formats
- Student data integration

---

## 4. **User Roles & Permissions**

### **System-Wide Roles**

- `sysadmin` — full system control, any organisation
- `dev` — development/debugging role (same as sysadmin for MVP)
- `user` — default system role
- `orgadmin` — admin for their own organisation only

### **Organisation Default Roles** _(customisable by OrgAdmin)_

- Lecturer
- Senior Lecturer
- Academic Manager

### **Permission Structure**

- **System Permission Registry** (`system_permissions`):
  - `group.action` format (e.g. `staff.create`, `modules.edit`)
  - Default roles assigned at creation

- **Organisation Roles** (`organisation_roles`):
  - Customisable per organisation
  - Each role linked to permissions via `organisation_role_permissions`

- **Permission Inheritance**:
  - New system permissions can be pushed to orgs
  - Orgs can override (remove/keep) defaults

---

## 5. **Academic Year Management**

- `academic_years` table:
  - `id`
  - `orgId`
  - `label` (e.g. "2025/26")
  - `status`: `"draft" | "published" | "archived"`
  - `isDefaultForOrg`: boolean

- **Visibility Rules**:
  - Staff see **published only**
  - OrgAdmin & SysAdmin see **draft + published**

- Courses, modules, groups, and allocations are **scoped to an academic year**
- Work on next year’s allocations can start while current year is live

---

## 6. **Core Data Structures**

### **Organisation**

- `id`, `name`, `domain`, `settings`

### **Courses**

- `id`, `orgId`, `code`, `name`

### **Course Years**

- `id`, `courseId`, `yearNumber` (1–3+)

### **Modules**

- `id`, `orgId`, `code`, `name`, `credits`

### **Course Year Modules**

- Join table: `courseYearId`, `moduleId`, `isCore`

### **Module Iterations** _(per academic year)_

- `id`, `moduleId`, `academicYearId`
- Optional: `totalHours`, `multiplier` (prep/marking)

### **Module Groups**

- `id`, `moduleIterationId`
- `name`
- `campusId` (optional)
- `sizePlanned`
- `dayOfWeek` (optional)
- `weekPattern` (optional)

### **Group Allocations**

- `id`, `groupId`, `lecturerId`
- `hoursComputed` (credits × base hours × multiplier)
- `hoursOverride` (manual entry)
- `type`: `"teaching" | "admin"`
- `academicYearId`
- `orgId`

### **Staff**

- `id`, `orgId`, `name`, `FTE`, `contractType` (`AP`, `TA`, `RA`), `maxTeachingHours` (from contractType × FTE)

---

## 7. **Hours Calculation Logic (MVP)**

**Contract Hours**

- `totalContract` = base hours × FTE (e.g., 1498 for 1.0 FTE)
- `maxTeaching` = based on contract type:
  - Academic Practitioner (AP) = 1200 hrs × FTE
  - Teaching Academic (TA) = 900 hrs × FTE
  - Research Academic (RA) = 450 hrs × FTE

**Allocated Teaching Hours** (sum for current AY):

- Module Teaching
- Module Prep & Marking (equal to Module Teaching)
- Dissertation Supervision (BSc, MSc, Doctoral)
- Other Teaching (custom categories)

**Allocated Admin Hours**:

- Module Leadership
- Course Leadership
- Personal Tutor
- CPD
- Recruitment
- Research Projects
- (All categories customisable per org)

**Available & Capacity**:

- `allocatedTotal` = teaching + admin
- `availableTeaching` = `maxTeaching` − teaching
- `capacity` = `totalContract` − `allocatedTotal`

---

## 8. **Key User Flows**

1. **Setup Academic Year**
   - Create AY (draft)
   - Set default for org (if new current year)
   - Publish when ready

2. **Course & Year Setup**
   - Create course
   - Add years (1–3+)
   - Attach modules to course years

3. **Module Iterations**
   - For each module, create iteration for current AY
   - Add groups (manual split for MVP)

4. **Allocation**
   - Assign lecturer to group
   - Auto-calculate hours (credits × multiplier)
   - Allow override

5. **Capacity Tracking**
   - `/staff` page: table view of total contract, teaching, admin, available, capacity, overload status

---

## 9. **MVP Feature Checklist**

- [x] Role/permission system (system + org levels)
- [x] Academic year scoping + visibility rules
- [ ] Course + year CRUD
- [ ] Module CRUD
- [ ] Link modules to course years
- [ ] Module iterations (per AY)
- [ ] Groups under iterations (manual)
- [ ] Lecturer allocations to groups
- [ ] Contract & capacity calculation
- [ ] Staff capacity dashboard

---

## 10. **Post-MVP Considerations**

- Automated cohort splitting into groups by site
- Timetable integration
- Bulk allocation tools
- Advanced reporting/export
- API endpoints for external systems

---

## 11. **Tech Notes**

- **Backend:** Convex functions with orgId + academicYearId scoping
- **Auth:** Clerk metadata → `organisationId`, `systemRole`, `orgRoleId[]`
- **UI:** Next.js (App Router), React Context/Store for selected AY
- **Audit Logging:** all create/update/delete actions with userId + timestamp
- **Indexes:** always on `(orgId, academicYearId)` for AY-scoped tables
