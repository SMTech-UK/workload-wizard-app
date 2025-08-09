# User Management

Consolidated features and setup for real user management (Clerk + Convex).

## Setup

- Env: Clerk keys, webhook secret; Convex URL
- Webhook: `/api/webhooks/clerk` for `user.created/updated/deleted`
- Initial sync via `/admin/users`

## Features

- List, invite, deactivate/reactivate, edit orgs
- Sync between Clerk and Convex
- Full audit of management actions

## Troubleshooting

- Verify webhook secret and endpoint
- Use admin UI sync if needed

_Last updated: January 2025_
