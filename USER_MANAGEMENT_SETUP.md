# Real User Management Setup Guide

This guide explains how to set up and use the real user management system that integrates Clerk authentication with Convex database.

## What's Been Implemented

✅ **Real User Management**: Replaced mock user listing with actual Clerk API calls
✅ **Convex Integration**: Users are stored in Convex database with proper relationships
✅ **Webhook Sync**: Automatic sync between Clerk and Convex via webhooks
✅ **Admin Interface**: Full admin interface for user management
✅ **User Invitation**: Real user invitation system with email notifications
✅ **Role-based Access**: Proper role management with organisation assignment

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_url
```

### 2. Clerk Webhook Setup

1. Go to your Clerk Dashboard
2. Navigate to Webhooks
3. Create a new webhook endpoint
4. Set the endpoint URL to: `https://your-domain.com/api/webhooks/clerk`
5. Select these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
6. Copy the webhook secret to your `.env.local`

### 3. Initial User Sync

1. Visit `/admin/users` as an admin user
2. Use the "Sync Users" button to sync existing Clerk users to Convex
3. Check the sync status to ensure databases are synchronized

## Features

### User Management

- **List Users**: View all users with their roles, organisations, and status
- **Invite Users**: Send invitations with specific roles and organisation assignment
- **Delete Users**: Soft delete users (sets `isActive` to false)
- **User Status**: Visual indicators for active/inactive users

### Data Structure

Users are stored in both Clerk and Convex:

**Clerk (Authentication)**:

- User authentication
- Email addresses
- Public metadata (role, organisationId)

**Convex (Application Data)**:

- User profiles
- Organisation relationships
- Role assignments
- Activity tracking

### Webhook Integration

The system automatically syncs user changes:

- New users created in Clerk → Created in Convex
- User updates in Clerk → Updated in Convex
- User deletions in Clerk → Soft deleted in Convex

## API Endpoints

### Server Actions (`src/lib/actions/`)

- `inviteUser()`: Create and invite new users
- `listUsers()`: Get all users from Convex
- `deleteUser()`: Delete user from both Clerk and Convex
- `updateUser()`: Update user in both systems

### Convex Functions (`convex/users.ts`)

- `list`: Query all users with organisation details
- `get`: Get single user by ID
- `create`: Create new user
- `update`: Update user details
- `remove`: Soft delete user
- `listByOrganisation`: Get users by organisation

### Webhook Handler (`src/app/api/webhooks/clerk/route.ts`)

- Handles Clerk webhook events
- Syncs user changes to Convex
- Verifies webhook signatures

## Usage

### For Admins

1. **View Users**: Visit `/admin/users` to see all users
2. **Invite Users**: Use the invitation form to add new users
3. **Sync Data**: Use the sync button to ensure data consistency
4. **Manage Users**: Delete or update user information

### For Developers

The system provides:

- Type-safe user management
- Real-time data with Convex
- Proper error handling
- Audit trail for user changes

## Troubleshooting

### Common Issues

1. **Webhook Not Working**
   - Check webhook secret in environment variables
   - Verify webhook endpoint URL is accessible
   - Check Clerk dashboard for webhook delivery status

2. **Users Not Syncing**
   - Run manual sync from admin interface
   - Check Convex logs for errors
   - Verify organisation IDs exist in Convex

3. **Permission Errors**
   - Ensure user has admin role in Clerk metadata
   - Check organisation assignments
   - Verify Convex permissions

### Debug Commands

```bash
# Check sync status
npm run dev
# Visit /admin/users and use "Check Status" button

# View Convex logs
npx convex logs

# Test webhook locally
# Use ngrok or similar to expose local endpoint
```

## Next Steps

With this foundation, you can now:

1. Add lecturer-specific profiles and workload management
2. Implement advanced role permissions
3. Add user activity tracking
4. Create organisation-specific dashboards
5. Add bulk user operations

The system is production-ready and provides a solid foundation for your workload management application.
