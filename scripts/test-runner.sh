#!/bin/bash

# WorkloadWizard Test Runner
# A comprehensive script to run different types of tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_TYPE="all"
PARALLEL=false
VERBOSE=false
UPDATE_SNAPSHOTS=false
PERFORMANCE_ONLY=false
VISUAL_ONLY=false

# Service management
NEXT_PID=""
CONVEX_PID=""
SERVICES_STARTED=false

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE        Test type: all, unit, e2e, performance, visual, smoke"
    echo "  -p, --parallel         Run tests in parallel"
    echo "  -v, --verbose          Verbose output"
    echo "  -u, --update           Update visual regression snapshots"
    echo "  --performance-only     Run only performance tests"
    echo "  --visual-only          Run only visual regression tests"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Run all tests"
    echo "  $0 -t e2e             # Run only E2E tests"
    echo "  $0 -t performance     # Run only performance tests"
    echo "  $0 -t visual          # Run only visual regression tests"
    echo "  $0 -p                 # Run tests in parallel"
    echo "  $0 -u                 # Update visual snapshots"
}

# Cleanup function to stop background services
cleanup_services() {
    if [[ -n "$NEXT_PID" ]]; then
        echo -e "${BLUE}Stopping Next.js (PID: $NEXT_PID)...${NC}"
        kill $NEXT_PID 2>/dev/null || true
        wait $NEXT_PID 2>/dev/null || true
    fi
    
    # Reset PIDs
    NEXT_PID=""
    SERVICES_STARTED=false
}

# Health check function for Next.js
check_next_health() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s "http://localhost:3000" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Next.js is healthy${NC}"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            echo -e "${RED}❌ Next.js health check failed after $max_attempts attempts${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for Next.js to be ready... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
}

# Health check function for Convex
check_convex_health() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        # Convex dev doesn't run a local server, so we check if the deployment is accessible
        if [[ -n "$NEXT_PUBLIC_CONVEX_URL" ]]; then
            # Try to ping the Convex deployment
            if curl -s "$NEXT_PUBLIC_CONVEX_URL" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Convex deployment is accessible${NC}"
                return 0
            fi
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            echo -e "${RED}❌ Convex health check failed after $max_attempts attempts${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}⏳ Waiting for Convex to be ready... (attempt $attempt/$max_attempts)${NC}"
        sleep 2
        ((attempt++))
    done
}

# Start required services for E2E tests
start_services() {
    if [[ "$TEST_TYPE" == "e2e" || "$TEST_TYPE" == "all" || "$TEST_TYPE" == "smoke" || "$TEST_TYPE" == "performance" || "$TEST_TYPE" == "visual" ]]; then
        echo -e "${BLUE}🚀 Starting required services for E2E tests...${NC}"
        
        # Check if Next.js is already running
        if curl -s "http://localhost:3000" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Next.js already running, skipping startup${NC}"
            SERVICES_STARTED=true
            return 0
        fi
        
        # Configure Convex dev deployment (this doesn't start a local server)
        echo -e "${BLUE}Configuring Convex dev deployment...${NC}"
        pnpm dev:convex --once >/dev/null 2>&1
        if [[ $? -eq 0 ]]; then
            echo -e "${GREEN}✅ Convex dev configured successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Convex dev configuration failed, continuing anyway...${NC}"
        fi
        
        # Start Next.js in background
        echo -e "${BLUE}Starting Next.js...${NC}"
        pnpm dev:next >/dev/null 2>&1 &
        NEXT_PID=$!
        echo -e "${BLUE}Next.js started with PID: $NEXT_PID${NC}"
        
        # Wait for Next.js to be healthy
        echo -e "${BLUE}Waiting for Next.js to be ready...${NC}"
        
        if ! check_next_health; then
            cleanup_services
            exit 1
        fi
        
        SERVICES_STARTED=true
        echo -e "${GREEN}✅ All services are ready!${NC}"
        
        # Set trap to cleanup services on script exit
        trap cleanup_services EXIT
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -p|--parallel)
            PARALLEL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -u|--update)
            UPDATE_SNAPSHOTS=true
            shift
            ;;
        --performance-only)
            PERFORMANCE_ONLY=true
            shift
            ;;
        --visual-only)
            VISUAL_ONLY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "tests" ]]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Source .env.local if it exists to load environment variables
if [[ -f ".env.local" ]]; then
    echo -e "${BLUE}Loading environment variables from .env.local${NC}"
    # Only export lines that look like valid environment variables (key=value)
    while IFS= read -r line; do
        # Skip empty lines, comments, and lines that don't contain '='
        if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# && "$line" =~ = ]]; then
            # Only export if it looks like a valid environment variable
            if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*= ]]; then
                export "$line"
            fi
        fi
    done < .env.local
fi

# Check if required environment variables are set
if [[ -z "$CLERK_TEST_USER_EMAIL" ]] || [[ -z "$CLERK_TEST_USER_PASSWORD" ]]; then
    echo -e "${YELLOW}Warning: CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD not set${NC}"
    echo "Some tests may fail without proper authentication"
fi

# Check if required environment variables for E2E tests are set
if [[ -z "$NEXT_PUBLIC_APP_URL" ]] || [[ -z "$NEXT_PUBLIC_CONVEX_URL" ]]; then
    echo -e "${YELLOW}Warning: NEXT_PUBLIC_APP_URL and/or NEXT_PUBLIC_CONVEX_URL not set${NC}"
    echo "E2E tests may fail without proper service URLs"
    echo "Current values:"
    echo "  NEXT_PUBLIC_APP_URL: '$NEXT_PUBLIC_APP_URL'"
    echo "  NEXT_PUBLIC_CONVEX_URL: '$NEXT_PUBLIC_CONVEX_URL'"
else
    echo -e "${GREEN}✅ Required environment variables are set${NC}"
    echo "  NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
    echo "  NEXT_PUBLIC_CONVEX_URL: $NEXT_PUBLIC_CONVEX_URL"
fi

# Function to run tests with proper error handling
run_tests() {
    local test_command="$1"
    local test_name="$2"
    
    echo -e "${BLUE}Running $test_name tests...${NC}"
    
    if $VERBOSE; then
        echo "Command: $test_command"
    fi
    
    # Ensure environment variables are available to the test command
    if [[ -f ".env.local" ]]; then
        # Export environment variables for the test command, filtering out invalid ones
        while IFS= read -r line; do
            # Skip empty lines, comments, and lines that don't contain '='
            if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# && "$line" =~ = ]]; then
                # Only export if it looks like a valid environment variable
                if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*= ]]; then
                    export "$line"
                fi
            fi
        done < .env.local
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name tests failed${NC}"
        return 1
    fi
}

# Function to check if tests exist
check_tests_exist() {
    local test_pattern="$1"
    local test_name="$2"
    
    if ! ls tests/**/*$test_pattern* 1> /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: No $test_name tests found${NC}"
        return 1
    fi
    return 0
}

# Main test execution logic
main() {
    echo -e "${BLUE}🚀 WorkloadWizard Test Runner${NC}"
    echo "=================================="
    
    # Set environment variable for admin tests
    export E2E_ASSUME_ADMIN=true
    
    # Update snapshots if requested
    if $UPDATE_SNAPSHOTS; then
        echo -e "${YELLOW}Updating visual regression snapshots...${NC}"
        export UPDATE_SNAPSHOTS=true
    fi
    
    local exit_code=0
    
    # Determine which tests to run
    if $PERFORMANCE_ONLY; then
        TEST_TYPE="performance"
    elif $VISUAL_ONLY; then
        TEST_TYPE="visual"
    fi
    
    # Start services if E2E tests are run
    start_services
    
    case $TEST_TYPE in
        "all")
            echo -e "${BLUE}Running all test suites...${NC}"
            
            # Unit tests
            if check_tests_exist ".spec.ts" "unit"; then
                if ! run_tests "pnpm test" "Unit"; then
                    exit_code=1
                fi
            fi
            
            # E2E tests
            if check_tests_exist ".spec.ts" "E2E"; then
                if ! run_tests "pnpm e2e" "E2E"; then
                    exit_code=1
                fi
            fi
            
            # Performance tests
            if check_tests_exist "performance.spec.ts" "Performance"; then
                if ! run_tests "pnpm test:e2e --grep performance" "Performance"; then
                    exit_code=1
                fi
            fi
            
            # Visual regression tests
            if check_tests_exist "visual-regression.spec.ts" "Visual Regression"; then
                if ! run_tests "pnpm test:e2e --grep visual-regression" "Visual Regression"; then
                    exit_code=1
                fi
            fi
            ;;
            
        "unit")
            if check_tests_exist ".spec.ts" "unit"; then
                if ! run_tests "pnpm test" "Unit"; then
                    exit_code=1
                fi
            fi
            ;;
            
        "e2e")
            if check_tests_exist ".spec.ts" "E2E"; then
                if ! run_tests "pnpm e2e" "E2E"; then
                    exit_code=1
                fi
            fi
            ;;
            
        "performance")
            if check_tests_exist "performance.spec.ts" "Performance"; then
                if ! run_tests "pnpm test:e2e --grep performance" "Performance"; then
                    exit_code=1
                fi
            fi
            ;;
            
        "visual")
            if check_tests_exist "visual-regression.spec.ts" "Visual Regression"; then
                if ! run_tests "pnpm test:e2e --grep visual-regression" "Visual Regression"; then
                    exit_code=1
                fi
            fi
            ;;
            
        "smoke")
            if check_tests_exist "smoke" "Smoke"; then
                if ! run_tests "pnpm test:smoke" "Smoke"; then
                    exit_code=1
                fi
            fi
            ;;
            
        *)
            echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
            show_help
            exit 1
            ;;
    esac
    
    # Summary
    echo ""
    echo "=================================="
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
    else
        echo -e "${RED}💥 Some tests failed. Check the output above for details.${NC}"
    fi
    
    # Show test results location
    if [[ -d "test-results" ]]; then
        echo -e "${BLUE}📊 Test results available in: test-results/${NC}"
        echo -e "${BLUE}📈 HTML report: test-results/html-report/index.html${NC}"
    fi
    
    exit $exit_code
}

# Run the main function
main "$@"
