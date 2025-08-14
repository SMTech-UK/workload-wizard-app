import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

class SentryExampleAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export async function GET() {
  try {
    // Add custom context for this API call
    Sentry.setContext("api_request", {
      method: "GET",
      endpoint: "/api/sentry-example-api",
      timestamp: new Date().toISOString(),
      user_agent: "test-client",
    });

    // Add custom tags
    Sentry.setTag("api_version", "v1");
    Sentry.setTag("api_method", "GET");
    Sentry.setTag("api_environment", process.env.NODE_ENV || "development");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "api",
      message: "GET request received",
      level: "info",
      data: {
        method: "GET",
        endpoint: "/api/sentry-example-api",
        timestamp: new Date().toISOString(),
      },
    });

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      message: "GET request processed successfully",
      timestamp: new Date().toISOString(),
      method: "GET",
      endpoint: "/api/sentry-example-api",
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();

    // Add custom context for this API call
    Sentry.setContext("api_request", {
      method: "POST",
      endpoint: "/api/sentry-example-api",
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get("user-agent") || "unknown",
      body_size: JSON.stringify(body).length,
    });

    // Add custom tags
    Sentry.setTag("api_version", "v1");
    Sentry.setTag("api_method", "POST");
    Sentry.setTag("api_environment", process.env.NODE_ENV || "development");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "api",
      message: "POST request received",
      level: "info",
      data: {
        method: "POST",
        endpoint: "/api/sentry-example-api",
        timestamp: new Date().toISOString(),
        body_size: JSON.stringify(body).length,
      },
    });

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 200));

    return NextResponse.json({
      success: true,
      message: "POST request processed successfully",
      timestamp: new Date().toISOString(),
      method: "POST",
      endpoint: "/api/sentry-example-api",
      received_data: body,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Parse request body
    const body = await request.json();

    // Add custom context for this API call
    Sentry.setContext("api_request", {
      method: "PUT",
      endpoint: "/api/sentry-example-api",
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get("user-agent") || "unknown",
      body_size: JSON.stringify(body).length,
    });

    // Add custom tags
    Sentry.setTag("api_version", "v1");
    Sentry.setTag("api_method", "PUT");
    Sentry.setTag("api_environment", process.env.NODE_ENV || "development");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "api",
      message: "PUT request received",
      level: "info",
      data: {
        method: "PUT",
        endpoint: "/api/sentry-example-api",
        timestamp: new Date().toISOString(),
        body_size: JSON.stringify(body).length,
      },
    });

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 150));

    return NextResponse.json({
      success: true,
      message: "PUT request processed successfully",
      timestamp: new Date().toISOString(),
      method: "PUT",
      endpoint: "/api/sentry-example-api",
      received_data: body,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    // Add custom context for this API call
    Sentry.setContext("api_request", {
      method: "DELETE",
      endpoint: "/api/sentry-example-api",
      timestamp: new Date().toISOString(),
      user_agent: "test-client",
    });

    // Add custom tags
    Sentry.setTag("api_version", "v1");
    Sentry.setTag("api_method", "DELETE");
    Sentry.setTag("api_environment", process.env.NODE_ENV || "development");

    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: "api",
      message: "DELETE request received",
      level: "info",
      data: {
        method: "DELETE",
        endpoint: "/api/sentry-example-api",
        timestamp: new Date().toISOString(),
      },
    });

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      message: "DELETE request processed successfully",
      timestamp: new Date().toISOString(),
      method: "DELETE",
      endpoint: "/api/sentry-example-api",
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
