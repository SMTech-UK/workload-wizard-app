# Release Notes - v0.4.0

## 🚀 New Features

### Academic Year Management

- **Year Switcher UI**: Added year switching functionality across the application
- **Module Iterations**: Implemented per-module control to create iterations for current organisation academic year
- **Academic Year Guards**: Added robust guards for academic year queries until Convex user exists

### Module & Course Management

- **Module CRUD Operations**: Complete schema and CRUD operations for modules
- **Module Linking**: Link modules to course years with proper relationships
- **Iterations Management**: Server queries and mutations to get/create iterations by year and default academic year
- **Module Iterations Indexes**: Added proper database indexing for module iterations

### Allocations System

- **Lecturer Assignment**: Implemented lecturer assignment functionality
- **Group Allocation Management**: Added group allocation management with permissions and error handling
- **Allocation Math**: Enhanced allocation calculations and management

### User Management & Permissions

- **Organisation Admin Scoping**: Improved organisation admin permissions and scoping
- **Safe Delete Operations**: Implemented soft delete with hard delete fallback for better data safety
- **Permission Toast Helper**: Added helper for permission-related toast notifications
- **Permission Error Handling**: Enhanced error handling for permission operations

### Authentication & Onboarding

- **Clerk Integration**: Wired Clerk authentication into Convex client for authenticated mutations
- **Onboarding Improvements**: Enhanced onboarding flow with session refresh and redirect handling
- **Middleware Fallbacks**: Added Clerk live metadata fallback for onboarding completion recognition
- **Session Management**: Improved session handling and onboarding completion detection

## 🔧 Improvements

### Code Quality & Development

- **Code Formatting**: Improved code formatting and readability across multiple files
- **Argument Handling**: Enhanced argument handling in queries and mutations
- **ESLint & Prettier**: Satisfied pre-commit hooks and improved code consistency
- **Build Readiness**: Optimised for Vercel preview deployments

### Performance & Security

- **Lazy Convex Initialisation**: Implemented lazy loading in middleware for better performance
- **Server-side Feature Flags**: Added server-side feature flag evaluation
- **Production Logging**: Reduced production logs for better performance
- **Security Updates**: Updated dependencies to address security vulnerabilities

### UI/UX Enhancements

- **UK English Localisation**: Updated UI text to use British English spellings
- **Branding Updates**: Updated site title to 'Workload Wizard' and refreshed favicon design
- **App Layout**: Improved overall application layout and structure

## 🐛 Bug Fixes

- **Onboarding Route**: Fixed 500 errors when Convex user is missing
- **Session Claims**: Resolved stale session claims issues during onboarding
- **Academic Year Queries**: Fixed queries returning errors when user doesn't exist
- **Clerk Client Invocation**: Corrected clerkClient usage in complete-onboarding route
- **User Actions**: Fixed organisation ID resolution and improved error handling

## 🔒 Security Updates

- **Cookie Security**: Updated cookie dependency to >=0.7.0 to address CVE-2024-47764 (GHSA-pxg6-pf52-xh8x)
- **ESBuild Security**: Updated esbuild to >=0.25.0 to address GHSA-67mh-4wv8-2f99
- **Dependency Updates**: General dependency updates for security and compatibility

## 📦 Dependencies

- **Vitest**: Aligned to 3.2.4 to match @vitest/ui
- **General Updates**: Updated various dependencies for security and performance improvements

## 🧪 Testing & Quality Assurance

- **Pre-commit Hooks**: All code now passes ESLint and Prettier checks
- **Build Verification**: Verified build readiness for production deployments
- **Error Handling**: Improved error handling and user feedback across the application

## 📋 Breaking Changes

None identified in this release.

## 🚨 Known Issues

None reported at this time.

## 🔄 Migration Notes

No migration steps required for existing users.

---

**Release Date**: $(date +%Y-%m-%d)  
**Previous Version**: v0.3.0  
**Next Version**: v0.5.0 (planned)
