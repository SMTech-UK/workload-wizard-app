# Sentry Integration (Error Tracking, Session Replay, User Feedback & Performance)

This is the canonical Sentry guide for `workload-wizard-app`.

## Overview

- **Error monitoring** for client, server, and edge functions
- **Session replay** with privacy-focused settings
- **User feedback** collection with customizable forms
- **Performance monitoring** with custom metrics and traces
- **Custom breadcrumbs** and context for debugging
- **Environment-specific** configuration (dev/prod)
- **Release tracking** for deployment monitoring

## Configuration Files

### Client Configuration (`src/instrumentation-client.ts`)

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Session replay with privacy settings
  replayIntegration({
    maskAllText: false,        // Keep some text for debugging
    maskAllInputs: true,       // Mask all input fields
    blockAllMedia: false,      // Allow media for debugging
    maskTextInputs: true,      // Mask text inputs
    maskInputOptions: {
      password: true,          // Always mask passwords
      email: true,             // Always mask emails
      phone: true,             // Always mask phone numbers
      creditCard: true,        // Always mask credit cards
      custom: (element) => {   // Custom masking logic
        // Mask sensitive form fields
        if (element.tagName === "input" && (
          element.className.includes("password") ||
          element.className.includes("secret") ||
          element.id.includes("password")
        )) {
          return true;
        }
        return false;
      },
    },
  }),

  // User feedback integration
  feedbackIntegration({
    buttonLabel: "Report a Bug",
    formTitle: "Help us improve!",
    submitButtonLabel: "Submit Feedback",
    categories: [
      { label: "Bug Report", value: "bug" },
      { label: "Feature Request", value: "feature" },
      { label: "General Feedback", value: "general" },
      { label: "Performance Issue", value: "performance" },
    ],
  }),

  // Performance monitoring
  performanceIntegration(),

  // Session tracking
  autoSessionTracking: true,

  // Error sampling
  errorSampleRate: 1.0,

  // Session replay sampling
  replaysSessionSampleRate: 0.1,      // 10% of all sessions
  replaysOnErrorSampleRate: 1.0,      // 100% of error sessions
});
```

### Server Configuration (`sentry.server.config.ts`)

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Performance monitoring
  enableTracing: true,
  tracesSampleRate: 1.0,

  // Session tracking
  autoSessionTracking: true,

  // Error sampling
  errorSampleRate: 1.0,

  // Custom context processors
  beforeSend(event, hint) {
    // Filter out certain error types
    if (event.exception) {
      const exception = event.exception.values?.[0];
      if (
        exception?.type === "NetworkError" &&
        exception?.value?.includes("fetch")
      ) {
        return null; // Filter out network fetch errors
      }
    }

    // Add custom context
    event.tags = {
      ...event.tags,
      service: "workload-wizard-server",
      component: "api",
    };

    return event;
  },
});
```

### Edge Configuration (`sentry.edge.config.ts`)

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Performance monitoring
  enableTracing: true,
  tracesSampleRate: 1,

  // Session tracking
  autoSessionTracking: true,

  // Custom context processors for edge functions
  beforeSend(event, hint) {
    event.tags = {
      ...event.tags,
      service: "workload-wizard-edge",
      component: "middleware",
      runtime: "edge",
    };

    return event;
  },
});
```

## Environment Variables

Add to `.env.local` as needed:

```bash
# Sentry DSN (required for error monitoring)
NEXT_PUBLIC_SENTRY_DSN=https://your_dsn@your_org.ingest.sentry.io/your_project

# App version for release tracking
NEXT_PUBLIC_APP_VERSION=1.0.0

# Environment
NODE_ENV=development
```

## Usage Examples

### Error Tracking

#### Basic Error Capture

```ts
import * as Sentry from "@sentry/nextjs";

try {
  // Your code here
} catch (error) {
  Sentry.captureException(error);
}
```

#### Custom Error Context

```ts
Sentry.captureException(error, {
  tags: {
    component: "user-form",
    action: "submit",
    user_id: userId,
  },
  extra: {
    form_data: formData,
    user_agent: navigator.userAgent,
  },
});
```

#### Manual Error Creation

```ts
const customError = new Error("Custom error message");
customError.name = "CustomErrorType";
Sentry.captureException(customError);
```

### Performance Monitoring

#### Custom Transactions

```ts
const transaction = Sentry.startTransaction({
  name: "user-registration",
  op: "user.registration",
});

// Add child spans
const dbSpan = transaction.startChildSpan({
  name: "database-insert",
  op: "db.insert",
});

// Simulate work
await insertUser(userData);

dbSpan.finish();
transaction.finish();
```

#### Performance Metrics

```ts
// Custom metrics (only available in newer Sentry versions)
try {
  if (Sentry.metrics) {
    // Increment counter
    Sentry.metrics.increment("user.registration.count", 1, {
      tags: {
        source: "web-form",
        plan: "free",
      },
    });

    // Set gauge
    Sentry.metrics.gauge("user.registration.time", 1500, {
      tags: {
        source: "web-form",
      },
    });

    // Record distribution
    Sentry.metrics.distribution("user.registration.size", 1024, {
      tags: {
        source: "web-form",
      },
    });
  }
} catch (error) {
  console.log("Custom metrics not supported:", error);
}
```

### User Feedback

#### Trigger Feedback Form

```ts
import { feedbackIntegration } from "@sentry/nextjs";

// The feedback form will automatically appear
// Users can submit bug reports, feature requests, etc.
```

#### Custom Feedback Collection

```ts
const feedbackId = await Sentry.captureUserFeedback({
  name: "John Doe",
  email: "john@example.com",
  comments: "The login form is not working properly",
  eventId: "event-id-from-error",
});
```

### Breadcrumbs and Context

#### Custom Breadcrumbs

```ts
Sentry.addBreadcrumb({
  category: "user-action",
  message: "User clicked submit button",
  level: "info",
  data: {
    button_id: "submit-btn",
    form_name: "registration",
    timestamp: new Date().toISOString(),
  },
});
```

#### User Context

```ts
Sentry.setUser({
  id: "user-123",
  email: "user@example.com",
  username: "johndoe",
  role: "admin",
});
```

#### Custom Context

```ts
Sentry.setContext("request", {
  method: "POST",
  url: "/api/users",
  headers: request.headers,
  body: request.body,
});
```

#### Custom Tags

```ts
Sentry.setTag("environment", process.env.NODE_ENV);
Sentry.setTag("version", process.env.NEXT_PUBLIC_APP_VERSION);
Sentry.setTag("user_type", "premium");
```

## Testing the Integration

### Sentry Test Dashboard

Visit `/sentry-example-page` for comprehensive testing of:

- Error reporting
- Performance monitoring
- Session replay
- User feedback
- Custom metrics
- Breadcrumbs and context

### API Testing

Test the Sentry API integration at `/api/sentry-example-api`:

- `GET` - Test performance monitoring and metrics
- `POST` - Test request context and breadcrumbs
- `PUT` - Test error reporting
- `DELETE` - Test custom spans and breadcrumbs

## Privacy and Security

### Session Replay Privacy

- **Text inputs are masked** by default
- **Sensitive fields** (passwords, emails) are always masked
- **Custom masking rules** for application-specific fields
- **No keystroke recording** for privacy

### Data Filtering

- **Network errors** are filtered out to reduce noise
- **Sensitive breadcrumbs** are automatically filtered
- **Custom context processors** for application-specific filtering

### Environment-Specific Settings

- **Development**: Full debugging enabled
- **Production**: Optimized for performance and privacy
- **Staging**: Balanced debugging and performance

## Performance Considerations

- **Session replay sampling**: 10% of normal sessions, 100% of error sessions
- **Error sampling**: 100% in development, configurable in production
- **Trace sampling**: 100% in development, configurable in production
- **Custom metrics**: Lightweight and efficient

## Monitoring and Alerts

### Error Alerts

- Configure error rate thresholds
- Set up alerts for critical errors
- Monitor error trends over time

### Performance Alerts

- Set up performance budgets
- Monitor transaction durations
- Track custom metrics

### Session Replay Alerts

- Monitor replay capture rates
- Set up alerts for replay failures
- Track replay storage usage

## Best Practices

### Error Handling

1. **Always capture errors** with context
2. **Use custom error types** for better categorization
3. **Add relevant tags** for filtering and grouping
4. **Include user context** when available

### Performance Monitoring

1. **Use meaningful transaction names**
2. **Add child spans** for complex operations
3. **Set custom metrics** for business KPIs
4. **Monitor performance trends** over time

### Privacy

1. **Never capture PII** in error reports
2. **Use custom masking** for sensitive fields
3. **Filter sensitive breadcrumbs**
4. **Respect user privacy** settings

## Troubleshooting

### Common Issues

#### Sentry Not Initializing

- Check `NEXT_PUBLIC_SENTRY_DSN` environment variable
- Verify Sentry package installation
- Check browser console for errors

#### Session Replay Not Working

- Verify replay integration is enabled
- Check sampling rates configuration
- Ensure privacy settings are correct

#### Performance Data Missing

- Verify tracing is enabled
- Check transaction sampling rates
- Ensure custom spans are properly finished

### Debug Mode

Enable debug mode in development:

```ts
debug: process.env.NODE_ENV === "development",
```

## References

- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Session Replay](https://docs.sentry.io/product/session-replay/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry User Feedback](https://docs.sentry.io/product/user-feedback/)
- [Sentry Custom Metrics](https://docs.sentry.io/product/metrics/)
- [Sentry Privacy](https://docs.sentry.io/product/security-privacy/)
