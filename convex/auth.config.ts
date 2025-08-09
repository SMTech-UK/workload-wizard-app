// Convex auth configuration for Clerk JWTs
// Set CLERK_JWT_ISSUER to the Issuer URL from your Clerk JWT template named "convex"

const issuer =
  process.env.CLERK_JWT_ISSUER || process.env.NEXT_PUBLIC_CLERK_JWT_ISSUER;

if (!issuer) {
  console.warn(
    "[convex/auth.config.ts] Missing CLERK_JWT_ISSUER. Set it to your Clerk JWT Issuer URL.",
  );
}

export default {
  providers: [
    {
      domain: issuer as string,
      applicationID: "convex", // must match your Clerk JWT template name
    },
  ],
};
