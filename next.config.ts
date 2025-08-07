import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
