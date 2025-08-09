// Configure Convex to trust Clerk-issued JWTs.
// Set CLERK_JWT_ISSUER_DOMAIN in your environment, e.g.:
//   https://<your-subdomain>.clerk.accounts.dev
// or your custom Clerk domain.
// Ensure you have a Clerk JWT template with Audience set to "convex".
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
};


