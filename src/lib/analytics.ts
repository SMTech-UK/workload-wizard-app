import posthog from "posthog-js";

/**
 * Enhanced Analytics Service with PostHog integration
 * Provides comprehensive tracking capabilities for user behavior, performance, and business metrics
 */
export class AnalyticsService {
  private isInitialized: boolean;

  constructor() {
    this.isInitialized =
      typeof posthog !== "undefined" && typeof posthog.capture === "function";
  }

  /**
   * Check if PostHog is available and initialized
   */
  private checkInitialization(): boolean {
    if (!this.isInitialized) {
      console.warn("Analytics service not initialized. PostHog not available.");
      return false;
    }
    return true;
  }

  /**
   * Identify a user with PostHog
   */
  identify(userId: string, properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.identify(userId, properties);
      console.log("✅ User identified:", userId, properties);
    } catch (error) {
      console.error("❌ Failed to identify user:", error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      if (posthog.people) {
        posthog.people.set(properties);
        console.log("✅ User properties set:", properties);
      } else {
        console.warn("PostHog people API not available");
      }
    } catch (error) {
      console.error("❌ Failed to set user properties:", error);
    }
  }

  /**
   * Track a custom event
   */
  track(eventName: string, properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Event tracked:", eventName, properties);
    } catch (error) {
      console.error("❌ Failed to track event:", error);
    }
  }

  /**
   * Track page view
   */
  trackPageView(path: string, properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("$pageview", {
        $current_url: path,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Page view tracked:", path, properties);
    } catch (error) {
      console.error("❌ Failed to track page view:", error);
    }
  }

  /**
   * Track feature flag usage
   */
  trackFeatureFlag(
    flagName: string,
    enabled: boolean,
    properties?: Record<string, any>,
  ): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("feature_flag_used", {
        flag_name: flagName,
        flag_enabled: enabled,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Feature flag tracked:", flagName, enabled, properties);
    } catch (error) {
      console.error("❌ Failed to track feature flag:", error);
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    metricName: string,
    value: number,
    properties?: Record<string, any>,
  ): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("performance_metric", {
        metric_name: metricName,
        metric_value: value,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log(
        "✅ Performance metric tracked:",
        metricName,
        value,
        properties,
      );
    } catch (error) {
      console.error("❌ Failed to track performance metric:", error);
    }
  }

  /**
   * Track errors
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("error_occurred", {
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack,
        ...context,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Error tracked:", error.message, context);
    } catch (trackingError) {
      console.error("❌ Failed to track error:", trackingError);
    }
  }

  /**
   * Track user actions
   */
  trackUserAction(action: string, properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("user_action", {
        action_name: action,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ User action tracked:", action, properties);
    } catch (error) {
      console.error("❌ Failed to track user action:", error);
    }
  }

  /**
   * Track session start
   */
  trackSessionStart(properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("session_started", {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Session start tracked:", properties);
    } catch (error) {
      console.error("❌ Failed to track session start:", error);
    }
  }

  /**
   * Track session end
   */
  trackSessionEnd(properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("session_ended", {
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Session end tracked:", properties);
    } catch (error) {
      console.error("❌ Failed to track session end:", error);
    }
  }

  /**
   * Track form interactions
   */
  trackFormStart(formName: string, properties?: Record<string, any>): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("form_started", {
        form_name: formName,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Form start tracked:", formName, properties);
    } catch (error) {
      console.error("❌ Failed to track form start:", error);
    }
  }

  /**
   * Track form submission
   */
  trackFormSubmit(
    formName: string,
    success: boolean,
    properties?: Record<string, any>,
  ): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("form_submitted", {
        form_name: formName,
        form_success: success,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Form submission tracked:", formName, success, properties);
    } catch (error) {
      console.error("❌ Failed to track form submission:", error);
    }
  }

  /**
   * Track navigation events
   */
  trackNavigation(
    from: string,
    to: string,
    properties?: Record<string, any>,
  ): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("navigation", {
        from_page: from,
        to_page: to,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Navigation tracked:", from, "→", to, properties);
    } catch (error) {
      console.error("❌ Failed to track navigation:", error);
    }
  }

  /**
   * Track search queries
   */
  trackSearch(
    query: string,
    resultsCount?: number,
    properties?: Record<string, any>,
  ): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.capture("search_performed", {
        search_query: query,
        results_count: resultsCount,
        ...properties,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
      console.log("✅ Search tracked:", query, resultsCount, properties);
    } catch (error) {
      console.error("❌ Failed to track search:", error);
    }
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): Record<string, any> {
    if (!this.checkInitialization()) return {};

    try {
      return {
        distinct_id: posthog.get_distinct_id(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      };
    } catch (error) {
      console.error("❌ Failed to get session metrics:", error);
      return {};
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, any> {
    if (!this.checkInitialization()) return {};

    try {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      return {
        page_load_time: navigation?.loadEventEnd - navigation?.loadEventStart,
        dom_content_loaded:
          navigation?.domContentLoadedEventEnd -
          navigation?.domContentLoadedEventStart,
        first_paint: performance.getEntriesByName("first-paint")[0]?.startTime,
        first_contentful_paint: performance.getEntriesByName(
          "first-contentful-paint",
        )[0]?.startTime,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      };
    } catch (error) {
      console.error("❌ Failed to get performance metrics:", error);
      return {};
    }
  }

  /**
   * Reset user identity
   */
  reset(): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.reset();
      console.log("✅ User identity reset");
    } catch (error) {
      console.error("❌ Failed to reset user identity:", error);
    }
  }

  /**
   * Opt out of tracking
   */
  optOut(): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.opt_out_capturing();
      console.log("✅ User opted out of tracking");
    } catch (error) {
      console.error("❌ Failed to opt out of tracking:", error);
    }
  }

  /**
   * Opt in to tracking
   */
  optIn(): void {
    if (!this.checkInitialization()) return;

    try {
      posthog.opt_in_capturing();
      console.log("✅ User opted in to tracking");
    } catch (error) {
      console.error("❌ Failed to opt in to tracking:", error);
    }
  }
}

// Export a default instance for convenience
export const analytics = new AnalyticsService();

// Export the class for custom instances
export default AnalyticsService;
