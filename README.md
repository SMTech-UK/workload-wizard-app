# Workload Wizard App

A comprehensive academic workload management system built with Next.js, Convex, and Clerk authentication.

## 📚 Documentation

- [Permission System Guide](./PERMISSION_SYSTEM_GUIDE.md) - Complete RBAC system documentation
- [Audit Logging Guide](./AUDIT_LOGGING_GUIDE.md) - Audit system documentation
- [User Management Setup](./USER_MANAGEMENT_SETUP.md) - User management configuration
- [User Management Features](./USER_MANAGEMENT_FEATURES.md) - User management capabilities
- [Password Management Guide](./PASSWORD_MANAGEMENT_GUIDE.md) - Password management system
- [Email Service Integration](./EMAIL_SERVICE_INTEGRATION_GUIDE.md) - Email service setup

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 🏗️ System Architecture

### Core Features

- **🔐 RBAC Permission System**: Granular role-based access control with audit logging
- **👥 User Management**: Multi-tenant user and organisation management
- **📊 Academic Workload**: Staff workload planning and management
- **🔍 Audit Logging**: Comprehensive activity tracking and compliance
- **📧 Email Integration**: Automated notifications and communications

### Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Clerk (user management and authentication)
- **UI Components**: shadcn/ui component library
- **Deployment**: Vercel platform

## 🚀 Key System Components

### Permission System
- System-wide permission registry at `/admin/permissions`
- Organisation-specific role management at `/organisation/roles`
- Granular permission checking with `hasPermission()` and `requirePermission()`
- Comprehensive audit logging for all permission changes

### User Management  
- Multi-tenant organisation support
- System and organisation role hierarchy
- User invitation and onboarding workflows
- Integration with Clerk authentication

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
