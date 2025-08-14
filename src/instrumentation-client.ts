import * as Sentry from "@sentry/nextjs";

// PostHog configuration with basic features
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  import("posthog-js").then((posthog) => {
    posthog.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    });
  });
}

// Sentry configuration with basic features
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV || "development",

  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || "v0.4.0",

  // Integrations
  integrations: [
    // Session replay integration
    Sentry.replayIntegration({
      // Mask sensitive data
      maskAllText: false,
      maskAllInputs: false,
      blockAllMedia: false,
    }),

    // Feedback integration
    Sentry.feedbackIntegration({
      // Custom categories
      categories: [
        { label: "Bug Report", value: "bug" },
        { label: "Feature Request", value: "feature" },
        { label: "General Feedback", value: "general" },
      ],
      // Screenshot configuration
      enableScreenshot: true,
      // Handle attachments properly
      attachments: true,
      colorScheme: "system",
    }),
  ],
});

// Export router transition hook for Sentry navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
