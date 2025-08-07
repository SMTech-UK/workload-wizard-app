import posthog from "posthog-js"

// Only initialize PostHog if the key is available and we're in the browser
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      defaults: '2025-05-24',
      capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
      debug: false, // Disable debug mode to prevent constant logging
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true, // Disable session recording if not needed
      // Explicitly disable web vitals to prevent warnings
      web_vitals: {
        CLS: false,
        FID: false,
        FCP: false,
        LCP: false,
        TTFB: false,
      },
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
    });
  } catch (error) {
    console.log('PostHog initialization failed:', error);
  }
}
