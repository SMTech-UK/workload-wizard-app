# Performance Testing

This directory contains hardened performance tests designed for CI determinism and consistent development environment testing.

## Overview

Performance tests measure key user journey timings and ensure the application meets performance expectations. The tests have been specifically hardened to:

- **Avoid cold start measurements** through proper warm-up sequences
- **Maintain consistent 20-second thresholds** for development environments
- **Ensure CI determinism** with environment-specific optimizations
- **Provide reliable baseline measurements** for performance monitoring

## Key Features

### 1. Warm-up Sequences

Every performance test includes a warm-up step that hits `/dashboard` before measuring actual performance. This ensures:

- **No cold start bias**: First paint measurements are excluded
- **Consistent baseline**: All tests start from a warmed-up state
- **Realistic measurements**: Performance reflects actual user experience

### 2. Development Thresholds

Performance thresholds are set to **20 seconds** for development environments:

- **Realistic expectations**: Accounts for development server overhead
- **CI compatibility**: Works reliably in CI environments
- **User experience focus**: Ensures acceptable performance for development

### 3. CI Determinism

Tests are optimized for CI environments with:

- **Extended timeouts**: 2 minutes in CI vs 1 minute locally
- **Environment detection**: Automatic CI-specific optimizations
- **Consistent measurements**: UTC timezone and standardized locale

## Test Coverage

### Page Load Performance

- **Dashboard**: Main landing page load time
- **Courses**: Course management page performance
- **Modules**: Module management page performance
- **Staff**: Staff capacity page performance
- **Academic Years**: Admin page performance

### User Interaction Performance

- **Course Creation**: Form submission and response time
- **Module Creation**: Module creation workflow timing
- **Search & Filter**: Search response time
- **Data Rendering**: Table/list rendering performance

### Navigation Performance

- **Page-to-Page**: Navigation between major sections
- **Memory Usage**: Memory consumption during navigation
- **CI Baseline**: Comprehensive performance baseline for CI

## Running Tests

### Basic Performance Test

```bash
pnpm test:performance
```

### Run with UI

```bash
pnpm test:ui:performance
```

### CI-Specific Testing

```bash
# Set CI environment variable
export CI=true
pnpm test:performance
```

## Performance Thresholds

### Development Environment

- **Page Load**: < 20 seconds
- **Course Creation**: < 5 seconds
- **Module Creation**: < 3 seconds
- **Search Response**: < 1 second
- **Table Rendering**: < 3 seconds
- **Navigation**: < 20 seconds average

### CI Environment

- **Extended Timeouts**: 2 minutes per test
- **Warm-up Sequences**: Complete warm-up before measurement
- **Baseline Testing**: Comprehensive performance baseline validation

## Warm-up Strategy

### Why Warm-up?

Performance tests without warm-up can be misleading because they measure:

- **Cold start times**: First paint after server startup
- **Cache misses**: Initial resource loading
- **JIT compilation**: JavaScript engine optimization

### Warm-up Process

1. **Navigate to dashboard**: Load main application entry point
2. **Wait for network idle**: Ensure all resources are loaded
3. **Verify page readiness**: Check for expected content
4. **Measure performance**: Now measure actual user experience

### Example Warm-up Sequence

```typescript
// Warm-up step: hit dashboard first to avoid cold start measurement
await page.goto("/dashboard");
await expect(page.getByRole("heading", { name: /Coming Soon/i })).toBeVisible({
  timeout: 10000,
});
await page.waitForLoadState("networkidle");

// Now measure the actual performance
const startTime = Date.now();
await page.goto("/courses");
// ... measure performance
```

## CI Optimizations

### Environment Variables

- **TZ=UTC**: Consistent timezone for all tests
- **CI_PERFORMANCE=true**: Enables CI-specific optimizations
- **Extended timeouts**: 2-minute timeouts in CI environments

### Context Options

- **Locale**: Standardized to `en-GB`
- **Timezone**: Fixed to `UTC`
- **Storage State**: Consistent authentication state

### Test Configuration

- **Dependencies**: Proper test sequencing
- **Timeout handling**: CI-appropriate timeouts
- **Error handling**: Graceful fallbacks for CI environments

## Troubleshooting

### Flaky Tests

If performance tests are flaky:

1. **Check warm-up**: Ensure warm-up sequences complete successfully
2. **Verify thresholds**: Confirm 20-second thresholds are appropriate
3. **Check environment**: Verify CI vs development environment settings
4. **Review timeouts**: Ensure timeouts are sufficient for your environment

### Performance Issues

If tests consistently fail performance thresholds:

1. **Development server**: Check if development server is running optimally
2. **Database performance**: Verify database connection and query performance
3. **Network conditions**: Check for network-related performance issues
4. **Resource constraints**: Ensure sufficient CPU/memory for testing

### CI Failures

If tests fail in CI:

1. **Timeout issues**: Increase CI timeouts if needed
2. **Resource allocation**: Ensure CI environment has sufficient resources
3. **Environment consistency**: Verify CI environment matches development
4. **Warm-up sequences**: Check that warm-up completes successfully

## Best Practices

### 1. Always Use Warm-up

Never measure performance without proper warm-up sequences.

### 2. Maintain 20s Thresholds

Keep development thresholds at 20 seconds for realistic expectations.

### 3. Test Locally First

Always run performance tests locally before CI to catch issues early.

### 4. Monitor Trends

Track performance over time to identify regressions.

### 5. CI Integration

Integrate performance tests into CI pipeline for continuous monitoring.

## File Structure

```
tests/e2e/
├── performance.spec.ts           # Main performance test file
├── PERFORMANCE_README.md         # This documentation
└── fixtures.ts                   # Shared test fixtures
```

## Configuration

### Playwright Config

Performance tests are configured in `playwright.config.ts`:

```typescript
{
  name: "performance",
  dependencies: ["setup"],
  testMatch: /.*performance\.spec\.ts/,
  use: {
    storageState: "tests/e2e/.auth/admin.json",
    contextOptions: {
      locale: "en-GB",
      timezoneId: "UTC",
    },
  },
  timeout: process.env.CI ? 120000 : 60000,
  env: {
    TZ: "UTC",
    CI_PERFORMANCE: process.env.CI ? "true" : "false",
  },
}
```

### Environment Variables

- **CI**: Set to `true` for CI environments
- **E2E_ASSUME_ADMIN**: Required for admin-gated tests
- **TZ**: Automatically set to UTC for performance tests
