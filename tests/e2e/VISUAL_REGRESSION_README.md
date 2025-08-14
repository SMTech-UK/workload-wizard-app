# Visual Regression Testing

This directory contains stabilised visual regression tests for the Workload Wizard app.

## Overview

Visual regression tests capture screenshots of key UI components and pages to detect unintended visual changes. The tests have been stabilised to ensure consistent, reproducible results.

## Stabilisation Measures

### 1. Timezone Freezing

- **Environment Variable**: `TZ=UTC` is set in Playwright config
- **JavaScript Override**: `Date.now()` returns a fixed timestamp (`2024-01-15T12:00:00.000Z`)
- **Random Values**: `Math.random()` returns predictable, sequential values

### 2. Animation/Transition Disabling

- **CSS File**: `visual-regression.css` disables all animations and transitions
- **Global Styles**: Applied to every test page to ensure consistent rendering
- **Wait Times**: Added 1-second delays after page loads to ensure stability

### 3. Theme Consistency

- **Light Theme**: All tests run in light mode for consistent appearance
- **Theme Toggle**: Automatically switches to light mode if needed
- **No Dark Mode**: Removed dark mode testing to avoid variations

### 4. Viewport Consistency

- **Desktop**: 1280x720 (default)
- **Tablet**: 768x1024 (responsive test)
- **Mobile**: 375x667 (responsive test)

## Running Tests

### Basic Visual Regression Test

```bash
pnpm test:visual
```

### Update Screenshot Baselines

After intentional UI changes, update baselines:

```bash
pnpm test:visual:update
```

### Run with UI

```bash
pnpm test:ui:visual
```

## Test Coverage

The visual regression tests cover:

- **Layout Components**: Dashboard, sidebar, navigation
- **Page Components**: Courses, modules, staff, academic years
- **UI Components**: Forms, tables, buttons, cards
- **Responsive Design**: Desktop, tablet, and mobile views
- **Theme Consistency**: Light theme only

## Screenshot Output

Screenshots are saved to:

- **Test Results**: `test-results/` directory
- **HTML Report**: `playwright-report/` directory
- **Baseline Images**: `tests/e2e/visual-regression.spec.ts-snapshots/`

## Configuration

### Playwright Config

- **Threshold**: 5% pixel difference tolerance (reduced from 10%)
- **Max Diff Pixels**: 50 pixels (reduced from 100)
- **Anti-aliasing**: Ignored for consistent comparison
- **Timezone**: UTC for all visual regression tests

### CSS Overrides

The `visual-regression.css` file:

- Disables all CSS animations and transitions
- Removes hover effects and transforms
- Ensures consistent font rendering
- Standardises scrollbar appearance

## Troubleshooting

### Flaky Tests

If tests are still flaky:

1. Check that `TZ=UTC` environment variable is set
2. Verify CSS file is being loaded correctly
3. Increase wait times if needed (currently 1 second)
4. Check for dynamic content that might not be frozen

### Baseline Updates

When updating baselines:

1. Ensure you're in the intended UI state
2. Run `pnpm test:visual:update`
3. Review the new baseline images
4. Commit the updated snapshots

### Environment Issues

- **Timezone**: Ensure system timezone doesn't interfere
- **Animations**: Check that CSS overrides are working
- **Theme**: Verify light theme is consistently applied

## Best Practices

1. **Run Tests Locally First**: Always test locally before CI
2. **Update Baselines**: Update baselines after intentional changes
3. **Review Changes**: Manually review screenshot differences
4. **Consistent Environment**: Use the same environment for baseline creation and testing
5. **Avoid Dynamic Content**: Don't test pages with timestamps or random IDs

## File Structure

```
tests/e2e/
├── visual-regression.spec.ts          # Main test file
├── visual-regression.css              # CSS overrides for stability
├── VISUAL_REGRESSION_README.md        # This documentation
└── visual-regression.spec.ts-snapshots/ # Baseline images
```
