# Event tracking report

This document lists all PostHog events that have been automatically added to your Next.js application.

## Events by File

### src/app/profile/[[...rest]]/page.tsx

- **profile-edit-started**: Fired when a user clicks the 'Edit Profile' button to start editing their information.
- **profile-updated**: Fired when a user successfully saves their updated profile information.
- **profile-edit-cancelled**: Fired when a user cancels the process of editing their profile.

### src/app/organisation/settings/page.tsx

- **suggested-action-clicked**: Fired when a user clicks on a suggested action link on the organisation settings page, which navigates them to a different part of the application.

### src/components/login-form.tsx

- **login_submitted**: Fired when a user submits the login form. Captures whether the login was successful and includes any error messages.
- **password_reset_requested**: Fired when a user submits the password reset form. Captures whether the request was successful and includes any error messages.

### src/components/domain/EditUserForm.tsx

- **user-details-updated**: Fired when an admin successfully saves changes to a user's details via the edit form.
- **user-password-reset-initiated**: Fired when an admin successfully initiates a password reset for a user.

### src/components/nav-main.tsx

- **main-nav-item-clicked**: Fired when a user clicks on a primary navigation item in the sidebar. Captures the item's title, URL, whether it has sub-items, and the current state of the sidebar (collapsed/expanded).
- **sub-nav-item-clicked**: Fired when a user clicks on a secondary (sub) navigation item in the sidebar. Captures the sub-item's title, URL, and the title of its parent item.


## Events still awaiting implementation
- (human: you can fill these in)
---

## Next Steps

1. Review the changes made to your files
2. Test that events are being captured correctly
3. Create insights and dashboards in PostHog
4. Make a list of events we missed above. Knock them out yourself, or give this file to an agent.

Learn more about what to measure with PostHog and why: https://posthog.com/docs/new-to-posthog/getting-hogpilled
