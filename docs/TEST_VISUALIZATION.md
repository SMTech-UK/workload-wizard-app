# Test Visualization Guide - WorkloadWizard

This guide covers all the ways to visualize, debug, and monitor your tests using Playwright UI and other tools.

## 🎯 **Quick Start - Test Visualization**

### 1. Playwright UI (Recommended)

The easiest way to visualize and debug tests is through Playwright's built-in UI:

```bash
# Open Playwright UI for all tests
pnpm test:ui

# Open UI for specific test types
pnpm test:ui:performance    # Performance tests only
pnpm test:ui:visual         # Visual regression tests only
pnpm test:ui:smoke          # Smoke tests only
```

**Features**:

- 🖥️ **Real-time test execution** with live browser view
- 🐛 **Step-by-step debugging** with pause/resume
- 📊 **Test results visualization** with pass/fail status
- 📸 **Screenshot comparison** for visual tests
- 📈 **Performance metrics** display
- 🔍 **Element inspection** and selector testing

### 2. HTML Reports

Generate and view detailed HTML reports:

```bash
# Generate HTML report
pnpm test:report

# View latest report
pnpm test:report:latest

# Open specific report
open playwright-report/index.html
```

## 🚀 **Advanced Test Visualization**

### 1. Interactive Test Debugging

```bash
# Run tests in debug mode
pnpm test:debug

# Debug specific test
pnpm test:debug --grep "dashboard performance"

# Debug with specific project
pnpm test:debug --project=performance
```

**Debug Features**:

- **Step-by-step execution** with pause points
- **Live browser inspection** during test execution
- **Console logging** and error tracking
- **Network request monitoring**
- **Performance profiling**

### 2. Test Results Analysis

```bash
# View test results directory
ls -la test-results/

# View screenshots
open test-results/

# View traces (on failure)
open test-results/*.zip
```

## 🎨 **Visual Regression Testing Visualization**

### 1. Screenshot Comparison

```bash
# Run visual tests with UI
pnpm test:ui:visual

# Update baseline screenshots
./scripts/test-runner.sh -u

# View screenshot differences
open test-results/
```

**Visual Test Features**:

- **Before/After comparison** with diff highlighting
- **Pixel-level difference** analysis
- **Responsive design** testing across viewports
- **Theme switching** validation
- **Component consistency** checking

### 2. Screenshot Management

```bash
# Clean old screenshots
rm -rf test-results/*.png

# Archive screenshots
mkdir -p test-results/archive/$(date +%Y%m%d)
mv test-results/*.png test-results/archive/$(date +%Y%m%d)/

# Compare specific screenshots
pnpm test:visual --grep "dashboard"
```

## 📊 **Performance Testing Visualization**

### 1. Performance Metrics Display

```bash
# Run performance tests with UI
pnpm test:ui:performance

# View performance results
cat test-results/results.json | jq '.results[].metrics'

# Performance dashboard
pnpm test:performance --reporter=html
```

**Performance Features**:

- **Load time metrics** with pass/fail thresholds
- **Navigation timing** analysis
- **Memory usage** monitoring
- **Performance regression** detection
- **Benchmark comparison**

### 2. Performance Profiling

```bash
# Run with detailed profiling
pnpm test:performance --trace=on

# View performance traces
open test-results/*.zip

# Performance analysis
pnpm test:performance --project=performance
```

## 🔍 **Test Debugging Tools**

### 1. Element Inspection

```bash
# Run tests with element highlighting
pnpm test:ui --headed

# Debug specific element
pnpm test:debug --grep "button click"
```

**Inspection Features**:

- **Element highlighting** during test execution
- **Selector validation** and testing
- **DOM structure** analysis
- **Attribute inspection**
- **Event monitoring**

### 2. Network Monitoring

```bash
# Monitor network requests
pnpm test:debug --project=e2e

# View network logs
cat test-results/results.json | jq '.results[].logs'
```

## 📱 **Responsive Testing Visualization**

### 1. Viewport Testing

```bash
# Test different screen sizes
pnpm test:ui:visual --grep "responsive"

# Mobile testing
pnpm test:visual --grep "mobile"

# Tablet testing
pnpm test:visual --grep "tablet"
```

**Responsive Features**:

- **Multiple viewport** testing
- **Touch interaction** simulation
- **Orientation** testing
- **Device emulation**
- **Responsive breakpoint** validation

## 🎭 **Test Scenarios Visualization**

### 1. User Journey Mapping

```bash
# Visualize complete workflows
pnpm test:ui --grep "workflow"

# Step-by-step execution
pnpm test:ui --grep "step"
```

**Journey Features**:

- **User flow** visualization
- **Step completion** tracking
- **Error point** identification
- **Success path** validation
- **Alternative flow** testing

### 2. Test Data Visualization

```bash
# View test data setup
pnpm test:ui --grep "setup"

# Monitor data changes
pnpm test:ui --grep "data"
```

## 🛠️ **Custom Visualization Tools**

### 1. Test Runner Script

```bash
# Run with verbose output
./scripts/test-runner.sh -v

# Run specific test types
./scripts/test-runner.sh -t performance

# Update visual snapshots
./scripts/test-runner.sh -u
```

### 2. Continuous Integration Visualization

```bash
# CI test results
pnpm test:all --reporter=json

# Generate CI report
pnpm test:all --reporter=html
```

## 📋 **Test Visualization Best Practices**

### 1. Regular Monitoring

- **Daily**: Run smoke tests with UI
- **Weekly**: Run performance tests with metrics
- **Monthly**: Run full visual regression suite
- **Before Release**: Complete test visualization

### 2. Performance Tracking

- **Baseline establishment** for all metrics
- **Regression detection** with alerts
- **Trend analysis** over time
- **Threshold adjustment** based on data

### 3. Visual Consistency

- **Baseline screenshot** management
- **Change impact** assessment
- **Responsive design** validation
- **Theme consistency** checking

## 🚨 **Troubleshooting Visualization Issues**

### 1. Common Problems

**UI Not Opening**:

```bash
# Check Playwright installation
npx playwright --version

# Reinstall Playwright
npx playwright install
```

**Screenshots Not Generating**:

```bash
# Check output directory
ls -la test-results/

# Verify permissions
chmod 755 test-results/
```

**Performance Metrics Missing**:

```bash
# Check browser support
pnpm test:performance --headed

# Verify performance API
pnpm test:performance --grep "navigation"
```

### 2. Debug Commands

```bash
# Verbose logging
DEBUG=pw:api pnpm test:ui

# Trace generation
pnpm test:debug --trace=on

# Screenshot on failure
pnpm test:visual --screenshot=on
```

## 🔧 **Advanced Configuration**

### 1. Custom Viewports

```typescript
// playwright.config.ts
use: {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  isMobile: false,
}
```

### 2. Custom Screenshot Settings

```typescript
// In test files
await expect(page).toHaveScreenshot("custom.png", {
  fullPage: true,
  timeout: 15000,
  mask: [page.locator(".sensitive-data")],
});
```

### 3. Performance Thresholds

```typescript
// Performance assertions
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(2000); // 2 seconds
```

## 📚 **Additional Resources**

- [Playwright UI Documentation](https://playwright.dev/docs/test-ui)
- [Visual Testing Guide](https://playwright.dev/docs/screenshots)
- [Performance Testing](https://playwright.dev/docs/test-api-testing)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Reports](https://playwright.dev/docs/test-reporters)

## 🎯 **Quick Reference Commands**

```bash
# 🖥️ Open Playwright UI
pnpm test:ui

# 📊 View test reports
pnpm test:report

# 🐛 Debug tests
pnpm test:debug

# 📸 Visual regression
pnpm test:ui:visual

# ⚡ Performance testing
pnpm test:ui:performance

# 🔄 Update snapshots
./scripts/test-runner.sh -u

# 📱 Responsive testing
pnpm test:ui --grep "responsive"

# 🎭 User journey testing
pnpm test:ui --grep "workflow"
```

---

**Last Updated**: $(date)
**Test Visualization Version**: 1.0.0
**Maintainer**: Development Team
