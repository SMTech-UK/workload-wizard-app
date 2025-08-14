# Workload Wizard App

A comprehensive workload management application for educational institutions, built with Next.js, Convex, and Clerk.

## 🚀 **New Advanced Features**

### **PostHog Analytics & Session Replays**

- **Session Recordings** with privacy-focused settings
- **Heatmaps** for user interaction analysis
- **Advanced Analytics** with autocapture and performance tracking
- **Feature Flags** and Early Access Features
- **Enhanced User Identification** with comprehensive tracking

### **Sentry Error Monitoring & Performance**

- **Session Replay** with privacy controls
- **User Feedback** collection with customizable forms
- **Performance Monitoring** with custom metrics and traces
- **Error Tracking** across client, server, and edge functions
- **Custom Breadcrumbs** and context for debugging

## 🛠️ **Tech Stack**

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Analytics**: PostHog (with session replays & heatmaps)
- **Monitoring**: Sentry (with session replay & user feedback)
- **Styling**: Tailwind CSS, shadcn/ui
- **Testing**: Playwright (E2E), Vitest (unit)

## 📊 **Key Features**

- **Academic Year Management** with scoped data access
- **Course & Module Management** with iterative planning
- **Staff Allocation** with capacity planning
- **Permission System** with role-based access control
- **Real-time Collaboration** with Convex
- **Comprehensive Testing** with 100% E2E coverage target

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- pnpm
- Convex account
- Clerk account
- PostHog account (optional)
- Sentry account (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd workload-wizard-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start the development server
pnpm dev

# In another terminal, start Convex
pnpm convex dev
```

### Environment Variables

```bash
# Required for Convex
NEXT_PUBLIC_CONVEX_URL=https://your_convex_url.convex.cloud

# Clerk (required for auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# PostHog (optional; enables analytics, session replays & heatmaps)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Sentry (optional; enables error monitoring & session replay)
NEXT_PUBLIC_SENTRY_DSN=https://your_dsn@your_org.ingest.sentry.io/your_project

# App version for tracking
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🧪 **Testing**

### E2E Tests

```bash
# Run all E2E tests
pnpm run e2e

# Run smoke tests only
pnpm run e2e:smoke

# Run specific test suites
pnpm run test:performance
pnpm run test:visual-regression
```

### Unit Tests

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## 📚 **Documentation**

- **PostHog Integration**: `./docs/POSTHOG.md` - Session replays, heatmaps, analytics
- **Sentry Integration**: `./docs/SENTRY.md` - Error tracking, session replay, user feedback
- **Permissions**: `./docs/PERMISSIONS.md` - Role-based access control
- **Feature Flags**: `./docs/FEATURE_FLAGS.md` - Feature management system
- **Testing**: `./docs/TESTING_PROCEDURES.md` - Testing guidelines and procedures

## 🔧 **Development**

### Code Quality

```bash
# Format code
pnpm format

# Lint code
pnpm lint

# Type check
pnpm type-check
```

### Database

```bash
# View Convex dashboard
pnpm convex dashboard

# Deploy schema changes
pnpm convex deploy
```

## 🌟 **Advanced Features**

### **PostHog Analytics Dashboard**

Visit `/dev/posthog-test` to test:

- Session recordings with privacy controls
- Heatmaps for user interaction analysis
- Feature flags and early access features
- Advanced analytics and user tracking

### **Sentry Monitoring Dashboard**

Visit `/sentry-example-page` to test:

- Error reporting and monitoring
- Performance tracking and metrics
- Session replay with privacy settings
- User feedback collection

### **Feature Flag Management**

Visit `/dev/feature-flags-test` to manage:

- PostHog feature flags
- Local feature flags
- Early access features
- Flag debugging and testing

## 📈 **Performance & Monitoring**

- **Real-time Analytics** with PostHog
- **Error Monitoring** with Sentry
- **Performance Tracking** with custom metrics
- **Session Replay** for debugging user issues
- **User Feedback** collection for continuous improvement

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

## 🆘 **Support**

For support and questions:

- Check the documentation in the `docs/` folder
- Review existing issues
- Create a new issue with detailed information
