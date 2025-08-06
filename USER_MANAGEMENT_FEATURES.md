# User Management Features

## Overview
This document describes the new user management features implemented for organisation admins and system administrators.

## Features Implemented

### 1. View Inactive Users
- **Feature**: Organisation admins can now view deactivated users in addition to active users
- **Implementation**: 
  - Toggle button in organisation users page to show/hide inactive users
  - New Convex query `listAllByOrganisation` to fetch all users (including inactive)
  - Updated user actions to support fetching all users vs active users only
- **Usage**: Click "Show Inactive" button on the organisation users page

### 2. Deactivation Confirmation Dialog
- **Feature**: Confirmation dialog when deactivating users to prevent accidental deactivation
- **Implementation**:
  - New `DeactivateConfirmationModal` component with detailed user information
  - Warning about what deactivation means
  - User details display before confirmation
- **Usage**: Click "Deactivate" button on any user → confirmation dialog appears

### 3. User Reactivation
- **Feature**: Organisation admins can reactivate previously deactivated users
- **Implementation**:
  - New `reactivateUser` function in user actions
  - Reactivate button appears for inactive users
  - Proper audit logging for reactivation events
- **Usage**: When viewing inactive users, click "Reactivate" button

### 4. Edit Organisation Functionality
- **Feature**: System admins can edit organisation details from the admin panel
- **Implementation**:
  - New `EditOrganisationForm` component with modal interface
  - Integration with existing `OrganisationsList` component
  - Uses existing Convex `organisations.update` mutation
  - Form validation and error handling
- **Usage**: Click "Edit" button on any organisation in the admin organisations list

## Environment Variables Required

No additional environment variables are required for the current features.

## Security Considerations

### Organisation Management
- Only available to users with `sysadmin` or `developer` roles
- All actions are logged in audit trail
- Soft delete approach preserves all organisation data

### User Deactivation/Reactivation
- Only orgadmin, sysadmin, and developer roles can perform these actions
- Cannot deactivate orgadmin or sysadmin users
- All actions are logged in audit trail
- Soft delete approach preserves all user data

## API Endpoints

No additional API endpoints were added for the current features. All functionality uses existing Convex mutations and queries.

## Components Added

1. `DeactivateConfirmationModal` - Confirmation dialog for user deactivation
2. `EditOrganisationForm` - Modal form for editing organisation details
3. Updated `OrganisationsList` - Added edit functionality and action buttons

## Database Changes

1. New Convex query `listAllByOrganisation` - Returns all users including inactive
2. Updated user actions to support fetching all users vs active users only

## Audit Logging

All user and organisation management actions are logged:
- User deactivation
- User reactivation
- Organisation updates

## Future Enhancements

1. **Bulk Operations**: Add ability to deactivate/reactivate multiple users at once
2. **User Activity Tracking**: Track when users were last active before deactivation
3. **Email Notifications**: Notify users when they are deactivated/reactivated
4. **Organisation Bulk Operations**: Add ability to update multiple organisations at once
5. **Organisation Activity Tracking**: Track organisation usage and activity metrics 