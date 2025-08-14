"use client";

import { useState } from "react";

export default function PostHogTestPage() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userProperties, setUserPropertiesState] = useState({
    name: "Test User",
    email: "test@example.com",
    role: "developer",
    team: "engineering",
  });

  const initializePostHog = async () => {
    try {
      const posthog = await import("posthog-js");

      if (posthog.default && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        });

        // Identify user
        posthog.default.identify("test-user-123", {
          name: "Test User",
          email: "test@example.com",
          role: "developer",
          team: "engineering",
        });

        setIsInitialized(true);
        console.log("✅ PostHog initialized successfully");
      } else {
        console.error("❌ PostHog key not configured");
      }
    } catch (error) {
      console.error("❌ Failed to initialize PostHog:", error);
    }
  };

  const testCustomEvents = async () => {
    try {
      const posthog = await import("posthog-js");

      if (posthog.default?.capture) {
        // Test custom event tracking
        posthog.default.capture("test_custom_event", {
          event_type: "manual_test",
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
          custom_property: "test_value",
        });

        console.log("✅ Custom event captured successfully");
      } else {
        console.error("❌ PostHog capture not available");
      }
    } catch (error) {
      console.error("❌ Custom events test failed:", error);
    }
  };

  const testAnalyticsService = async () => {
    try {
      const { AnalyticsService } = await import("@/lib/analytics");

      if (AnalyticsService) {
        const analytics = new AnalyticsService();

        // Test various analytics methods
        analytics.track("test_analytics_service", {
          method: "manual_test",
          timestamp: new Date().toISOString(),
        });

        analytics.trackPageView("/dev/posthog-test", {
          title: "PostHog Test Page",
          referrer: document.referrer,
        });

        analytics.trackUserAction("button_click", {
          button_id: "test_analytics",
          page: "posthog-test",
        });

        console.log("✅ Analytics service test completed");
      } else {
        console.error("❌ Analytics service not available");
      }
    } catch (error) {
      console.error("❌ Analytics service test failed:", error);
    }
  };

  const setUserProperties = async () => {
    try {
      const posthog = await import("posthog-js");

      if (posthog.default?.people) {
        // Set user properties using the people API
        posthog.default.people.set({
          name: userProperties.name,
          email: userProperties.email,
          role: userProperties.role,
          team: userProperties.team,
          last_updated: new Date().toISOString(),
        });

        console.log("✅ User properties set successfully");
      } else {
        console.error("❌ PostHog people API not available");
      }
    } catch (error) {
      console.error("❌ Failed to set user properties:", error);
    }
  };

  const updateUserProperty = (key: string, value: string) => {
    setUserPropertiesState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">PostHog Integration Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Initialization */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Initialization</h2>
          <button
            onClick={initializePostHog}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-3"
          >
            Initialize PostHog
          </button>
          {isInitialized && (
            <div className="text-sm text-green-600">✅ PostHog initialized</div>
          )}
        </div>

        {/* Custom Events Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Custom Events</h2>
          <button
            onClick={testCustomEvents}
            className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600"
          >
            Test Custom Events
          </button>
        </div>

        {/* Analytics Service Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Analytics Service</h2>
          <button
            onClick={testAnalyticsService}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
          >
            Test Analytics Service
          </button>
        </div>

        {/* User Properties */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User Properties</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={userProperties.name}
                onChange={(e) => updateUserProperty("name", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={userProperties.email}
                onChange={(e) => updateUserProperty("email", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <input
                type="text"
                value={userProperties.role}
                onChange={(e) => updateUserProperty("role", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Team
              </label>
              <input
                type="text"
                value={userProperties.team}
                onChange={(e) => updateUserProperty("team", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={setUserProperties}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Update User Properties
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>First, initialize PostHog to enable all features</li>
          <li>Click each test button to verify PostHog functionality</li>
          <li>Check the browser console for detailed logs</li>
          <li>Monitor your PostHog dashboard for incoming events</li>
          <li>Verify that events and user properties are captured</li>
        </ol>
      </div>
    </div>
  );
}
