"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

class SentryExampleFrontendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SentryExampleFrontendError";
  }
}

export default function SentryExamplePage() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const testSentryConnectivity = async () => {
    const result = await Sentry.diagnoseSdkConnectivity();
    setIsConnected(result !== "sentry-unreachable");
  };

  const testErrorReporting = async () => {
    try {
      // Test basic error reporting
      throw new SentryExampleFrontendError(
        "This is a test error from the frontend",
      );
    } catch (error) {
      Sentry.captureException(error);
      console.log("✅ Error captured and sent to Sentry");
    }
  };

  const testUserFeedback = async () => {
    try {
      // Test user feedback (using the correct API name)
      const feedbackId = await Sentry.captureFeedback({
        name: "Test User",
        email: "test@example.com",
        message: "This is a test feedback submission",
        url: window.location.href,
      });

      setFeedbackSubmitted(true);
      console.log("✅ User feedback submitted with ID:", feedbackId);
    } catch (error) {
      console.error("❌ User feedback submission failed:", error);
    }
  };

  const testBreadcrumbs = async () => {
    try {
      // Add various types of breadcrumbs
      Sentry.addBreadcrumb({
        category: "navigation",
        message: "User navigated to Sentry test page",
        level: "info",
        data: {
          from: document.referrer,
          to: window.location.href,
        },
      });

      Sentry.addBreadcrumb({
        category: "user",
        message: "User performed test action",
        level: "info",
        data: {
          action: "breadcrumb_test",
          timestamp: new Date().toISOString(),
        },
      });

      console.log("✅ Breadcrumbs added successfully");
    } catch (error) {
      console.error("❌ Breadcrumb test failed:", error);
    }
  };

  const testContext = async () => {
    try {
      // Set various types of context
      Sentry.setContext("user", {
        id: "test-user-123",
        username: "testuser",
        role: "developer",
        preferences: {
          theme: "dark",
          language: "en",
        },
      });

      Sentry.setContext("device", {
        type: "desktop",
        os: navigator.platform,
        browser: navigator.userAgent,
        screen: {
          width: screen.width,
          height: screen.height,
        },
      });

      Sentry.setContext("app", {
        version: process.env.NEXT_PUBLIC_APP_VERSION || "v0.4.0",
        environment: process.env.NODE_ENV || "development",
        build: "test-build",
      });

      console.log("✅ Context set successfully");
    } catch (error) {
      console.error("❌ Context test failed:", error);
    }
  };

  const testTags = async () => {
    try {
      // Set various tags
      Sentry.setTag("test_type", "manual");
      Sentry.setTag("test_category", "frontend");
      Sentry.setTag("test_environment", process.env.NODE_ENV || "development");
      Sentry.setTag("test_timestamp", new Date().toISOString());
      Sentry.setTag("test_user_agent", navigator.userAgent);

      console.log("✅ Tags set successfully");
    } catch (error) {
      console.error("❌ Tags test failed:", error);
    }
  };

  const testAPIError = async () => {
    try {
      // Test API error reporting
      const response = await fetch("/api/sentry-example-api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ API test successful:", data);
    } catch (error) {
      Sentry.captureException(error);
      console.log("✅ API error captured and sent to Sentry");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Sentry Integration Test Page</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connectivity Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Connectivity Test</h2>
          <button
            onClick={testSentryConnectivity}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-3"
          >
            Test Sentry Connectivity
          </button>
          {isConnected !== null && (
            <div
              className={`text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}
            >
              {isConnected
                ? "✅ Connected to Sentry"
                : "❌ Not connected to Sentry"}
            </div>
          )}
        </div>

        {/* Error Reporting Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Error Reporting</h2>
          <button
            onClick={testErrorReporting}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Test Error Reporting
          </button>
        </div>

        {/* User Feedback Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User Feedback</h2>
          <button
            onClick={testUserFeedback}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 mb-3"
          >
            Test User Feedback
          </button>
          {feedbackSubmitted && (
            <div className="text-sm text-green-600">
              ✅ Feedback submitted successfully
            </div>
          )}
        </div>

        {/* Breadcrumbs Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Breadcrumbs</h2>
          <button
            onClick={testBreadcrumbs}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Test Breadcrumbs
          </button>
        </div>

        {/* Context Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Context</h2>
          <button
            onClick={testContext}
            className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600"
          >
            Test Context
          </button>
        </div>

        {/* Tags Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Tags</h2>
          <button
            onClick={testTags}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
          >
            Test Tags
          </button>
        </div>

        {/* API Error Test */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">API Error Test</h2>
          <button
            onClick={testAPIError}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Test API Error
          </button>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Click each test button to verify Sentry functionality</li>
          <li>Check the browser console for detailed logs</li>
          <li>Monitor your Sentry dashboard for incoming events</li>
          <li>Verify that errors, user feedback, and context are captured</li>
        </ol>
      </div>
    </div>
  );
}
