🚀 Recommended Testing Strategy
Keep existing tests - they're solid foundation
Add integration tests for core workflows (academic year → course → module → allocation)
Add E2E tests for critical user journeys
Manual testing focus on business logic validation
Performance testing for database queries and UI responsiveness

Enhance the helper route to actually create a lecturer via Convex with a dev-only mutation; then call it in the allocation test before asserting totals.
Increase expect timeouts in the core workflow file to 10–15s for high-latency environments.
Add an environment variable (e.g., E2E_ASSUME_ADMIN=true) to skip permission/audit tests unless admin access is assured.

# WorkloadWizard — MVP Testing Checklist

## 🧪 **Core Authentication & Authorization**

- [ ] **User Registration/Login Flow**
  - Clerk authentication integration
  - Organisation selection/creation
  - Role assignment (sysadmin, orgadmin, lecturer)
  - Session persistence across page refreshes

- [ ] **Permission System Validation**
  - System-wide permissions (`staff.create`, `modules.edit`, etc.)
  - Organisation-scoped permissions
  - Role inheritance and overrides
  - Permission gates working on UI components

## 📅 **Academic Year Management**

- [ ] **Year Creation & Status Management**
  - Create new academic year (draft status)
  - Set as default for organisation
  - Publish year (changes visibility rules)
  - Archive old years
  - Year switcher working across all pages

- [ ] **Visibility Rules**
  - Staff see published years only
  - Admins see draft + published
  - Proper scoping of all data by academic year

## 🎓 **Course & Module Management**

- [ ] **Course CRUD Operations**
  - Create/edit/delete courses
  - Add course years (1-3+)
  - Link modules to course years
  - Validation of required fields

- [ ] **Module Management**
  - Create/edit/delete modules
  - Set credits and other metadata
  - Module iterations per academic year
  - Group creation under iterations

## 👥 **Staff & Allocation System**

- [ ] **Staff Management**
  - Create/edit/delete staff records
  - Set FTE, contract type (AP/TA/RA)
  - Contract hours calculation
  - Max teaching hours based on contract

- [ ] **Allocation Workflow**
  - Assign lecturers to groups
  - Auto-calculate hours (credits × multiplier)
  - Manual hour overrides
  - Teaching vs admin hour allocation

## 📊 **Capacity Tracking**

- [ ] **Hours Calculation**
  - Contract hours = base × FTE
  - Teaching hours allocation
  - Admin hours allocation
  - Available capacity calculation
  - Overload detection

- [ ] **Staff Dashboard**
  - Total contract hours
  - Allocated teaching/admin hours
  - Available capacity
  - Overload warnings

## �� **Data Integrity & Validation**

- [ ] **Academic Year Scoping**
  - All queries properly scoped by `(orgId, academicYearId)`
  - No data leakage between years
  - Proper indexing on scoped queries

- [ ] **Referential Integrity**
  - Cascade deletes working properly
  - Orphaned records prevention
  - Data consistency across related tables

## �� **UI/UX Validation**

- [ ] **Responsive Design**
  - Mobile-friendly layouts
  - Tablet/desktop breakpoints
  - Navigation working on all screen sizes

- [ ] **User Experience**
  - Clear error messages
  - Loading states
  - Success confirmations
  - Intuitive navigation flow

## ⚡ **Performance & Security**

- [ ] **Performance**
  - Page load times under 3 seconds
  - Efficient database queries
  - Proper caching strategies
  - No memory leaks

- [ ] **Security**
  - Authentication bypass impossible
  - Proper CSRF protection
  - SQL injection prevention
  - XSS protection

## 🔌 **Integration Testing**

- [ ] **API Endpoints**
  - All CRUD operations working
  - Proper error handling
  - Rate limiting (if applicable)
  - Input validation

- [ ] **External Services**
  - Clerk authentication
  - Convex database
  - Email service (if enabled)
  - Analytics tracking

## 🚨 **Edge Cases & Error Handling**

- [ ] **Error Scenarios**
  - Network failures
  - Invalid data input
  - Permission denied cases
  - Concurrent user conflicts

- [ ] **Data Edge Cases**
  - Zero FTE staff
  - Negative hours
  - Extremely large numbers
  - Special characters in names

## �� **Browser & Device Testing**

- [ ] **Browser Compatibility**
  - Chrome (latest)
  - Firefox (latest)
  - Safari (latest)
  - Edge (latest)

- [ ] **Device Testing**
  - iOS Safari
  - Android Chrome
  - Various screen resolutions

## �� **Load Testing**

- [ ] **Concurrent Users**
  - Multiple users accessing same data
  - Simultaneous allocations
  - Year switching under load

## �� **Data Migration & Backup**

- [ ] **Data Safety**
  - Backup procedures working
  - Data export functionality
  - Migration scripts tested
  - Rollback procedures

## 🚀 **Quick Start Testing Commands**

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm e2e

# Run specific smoke test
pnpm test:smoke

# Check code quality
pnpm lint
pnpm format
pnpm typecheck

# Build verification
pnpm build
```

## �� **Priority Testing Order**

1. **Authentication & Basic Navigation** (critical path)
2. **Academic Year Management** (core functionality)
3. **Course/Module CRUD** (data foundation)
4. **Staff Allocation** (main workflow)
5. **Capacity Calculations** (business logic)
6. **Permission System** (security)
7. **UI/UX Polish** (user experience)
8. **Performance & Edge Cases** (stability)

## 📝 **Testing Notes**

- Use existing test data from dev tools seeding
- Focus on integration testing between components
- Validate business logic calculations thoroughly
- Test permission boundaries with different user roles
- Verify academic year scoping prevents data leakage
