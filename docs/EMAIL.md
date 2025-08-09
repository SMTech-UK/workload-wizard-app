# Email Integration (Provider Agnostic)

This is the canonical email guide for `workload-wizard-app`.

## Overview

- Provider-agnostic service at `src/lib/services/emailService.ts`
- Uses environment variables for sender and URLs
- Invitation emails with temporary passwords

## Required environment variables

```bash
# Core email
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=system@workload-wiz.xyz

# App URLs
NEXT_PUBLIC_APP_URL=https://workload-wiz.xyz
NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://workload-wiz.xyz/sign-in
NEXT_PUBLIC_DASHBOARD_URL=https://workload-wiz.xyz/dashboard

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your_convex_url.convex.cloud
```

See the Environment notes below for URL resolution and fallbacks.

## Implementing a provider

Edit `src/lib/services/emailService.ts` and plug your provider (Resend recommended). Example Resend implementation excerpt:

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendUserInvitationEmail(
  data: UserInvitationEmailData,
): Promise<EmailResult> {
  const result = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: data.to,
    subject: "Welcome to Workload Wizard - Your Account Details",
    html: generateInvitationEmailHTML(data),
    text: generateInvitationEmailText(data),
  });
  return { success: true, messageId: result.data?.id };
}
```

## Environment notes (URL resolution)

- Prefer `NEXT_PUBLIC_APP_URL` as base
- If missing, derive from `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- If still missing, derive from `FROM_EMAIL` domain
- Dev fallback to `http://localhost:3000`

## URL consistency and Resend warning

All URLs in templates are resolved to absolute URLs matching your domain. If you see mismatch warnings, ensure `FROM_EMAIL`’s domain matches your app domain and that `NEXT_PUBLIC_CLERK_SIGN_IN_URL` points at the correct host.

## Testing

- Use your admin panel flows or add a small script calling `sendTestEmail()`
- Verify delivery in provider dashboard
- Ensure links point to your app domain

## Security

- Never commit API keys
- Verify sender domain (SPF/DKIM) for deliverability
- Temporary passwords must be rotated on first login
