#!/bin/bash

# WorkloadWizard CI Recipe Script
# Single command to run the complete CI workflow locally
# This mimics the GitHub Actions CI workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service management
NEXT_PID=""
CONVEX_PID=""
SERVICES_STARTED=false

# Configuration
CI_TIMEOUT=120
HEALTH_CHECK_INTERVAL=2
MAX_HEALTH_ATTEMPTS=30

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help             Show this help message"
    echo "  -t, --timeout SECONDS  Set timeout for service startup (default: 120)"
    echo "  -s, --skip-services    Skip starting Next.js and Convex services"
    echo "  -e, --env-file FILE    Use specific environment file (default: .env.ci)"
    echo "  -v, --verbose          Verbose output"
    echo ""
    echo "This script runs the complete CI workflow:"
    echo "1. Install dependencies"
    echo "2. Format code"
    echo "3. Lint code"
    echo "4. Type check"
    echo "5. Start Next.js + Convex (unless skipped)"
    echo "6. Run test setup"
    echo "7. Run E2E tests"
    echo "8. Run unit tests"
    echo "9. Run visual regression tests"
    echo "10. Run performance tests"
    echo "11. Build application"
    echo ""
    echo "Examples:"
    echo "  $0                     # Run complete CI workflow"
    echo "  $0 -s                 # Skip service startup"
    echo "  $0 -t 180            # Set 3-minute timeout"
    echo "  $0 -e .env.local     # Use local environment file"
}

# Parse command line arguments
SKIP_SERVICES=false
ENV_FILE=".env.ci"
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -t|--timeout)
            CI_TIMEOUT="$2"
            shift 2
            ;;
        -s|--skip-services)
            SKIP_SERVICES=true
            shift
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Log function
log() {
    local level="$1"
    local message="$2"
    local color="$3"
    
    case $level in
        "INFO")
            echo -e "${color}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${color}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${color}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${color}❌ $message${NC}"
            ;;
        "STEP")
            echo -e "${color}🚀 $message${NC}"
            ;;
        *)
            echo -e "$message${NC}"
            ;;
    esac
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up services..." "$BLUE"
    
    if [[ -n "$NEXT_PID" ]]; then
        kill "$NEXT_PID" 2>/dev/null || true
        log "INFO" "Stopped Next.js (PID: $NEXT_PID)" "$BLUE"
    fi
    
    if [[ -n "$CONVEX_PID" ]]; then
        kill "$CONVEX_PID" 2>/dev/null || true
        log "INFO" "Stopped Convex (PID: $CONVEX_PID)" "$BLUE"
    fi
    
    # Clean up PID files
    rm -f .next.pid .convex.pid
    
    SERVICES_STARTED=false
}

# Health check function for Next.js
check_next_health() {
    local max_attempts=$MAX_HEALTH_ATTEMPTS
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s "http://localhost:3000" >/dev/null 2>&1; then
            log "SUCCESS" "Next.js is healthy" "$GREEN"
            return 0
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "ERROR" "Next.js health check failed after $max_attempts attempts" "$RED"
            return 1
        fi
        
        log "INFO" "Waiting for Next.js to be ready... (attempt $attempt/$max_attempts)" "$YELLOW"
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done
}

# Start services function
start_services() {
    if $SKIP_SERVICES; then
        log "INFO" "Skipping service startup as requested" "$YELLOW"
        return 0
    fi
    
    log "STEP" "Starting Next.js and Convex services..." "$PURPLE"
    
    # Check if services are already running
    if curl -s "http://localhost:3000" >/dev/null 2>&1; then
        log "INFO" "Next.js already running, skipping startup" "$GREEN"
        SERVICES_STARTED=true
        return 0
    fi
    
    # Start Convex dev deployment
    log "INFO" "Starting Convex dev deployment..." "$BLUE"
    pnpm dev:convex --once >/dev/null 2>&1 &
    CONVEX_PID=$!
    log "INFO" "Convex started with PID: $CONVEX_PID" "$BLUE"
    
    # Start Next.js
    log "INFO" "Starting Next.js..." "$BLUE"
    pnpm dev:next >/dev/null 2>&1 &
    NEXT_PID=$!
    log "INFO" "Next.js started with PID: $NEXT_PID" "$BLUE"
    
    # Store PIDs for cleanup
    echo "$NEXT_PID" > .next.pid
    echo "$CONVEX_PID" > .convex.pid
    
    # Wait for services to be ready
    log "INFO" "Waiting for services to be ready (timeout: ${CI_TIMEOUT}s)..." "$BLUE"
    
    # Wait for Next.js with timeout
    if timeout "$CI_TIMEOUT" bash -c 'until curl -s http://localhost:3000 >/dev/null; do sleep 2; done'; then
        log "SUCCESS" "Next.js is ready at http://localhost:3000" "$GREEN"
        SERVICES_STARTED=true
        
        # Set trap to cleanup services on script exit
        trap cleanup EXIT
        
        return 0
    else
        log "ERROR" "Next.js failed to start within ${CI_TIMEOUT} seconds" "$RED"
        cleanup
        exit 1
    fi
}

# Load environment variables
load_env() {
    if [[ -f "$ENV_FILE" ]]; then
        log "INFO" "Loading environment variables from $ENV_FILE" "$BLUE"
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    else
        log "WARNING" "Environment file $ENV_FILE not found, using system defaults" "$YELLOW"
    fi
    
    # Set CI-specific variables
    export CI=true
    export E2E_ASSUME_ADMIN=true
    export CI_PERFORMANCE=true
    export TZ=UTC
    export PLAYWRIGHT_DISABLE_ANIMATIONS=1
    
    log "SUCCESS" "Environment variables loaded" "$GREEN"
}

# Check prerequisites
check_prerequisites() {
    log "STEP" "Checking prerequisites..." "$PURPLE"
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "tests" ]]; then
        log "ERROR" "Must run from project root directory" "$RED"
        exit 1
    fi
    
    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        log "ERROR" "pnpm is not installed or not in PATH" "$RED"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js is not installed or not in PATH" "$RED"
        exit 1
    fi
    
    log "SUCCESS" "Prerequisites check passed" "$GREEN"
}

# Install dependencies
install_dependencies() {
    log "STEP" "Installing dependencies..." "$PURPLE"
    
    if pnpm install --frozen-lockfile; then
        log "SUCCESS" "Dependencies installed successfully" "$GREEN"
    else
        log "ERROR" "Failed to install dependencies" "$RED"
        exit 1
    fi
}

# Format code
format_code() {
    log "STEP" "Formatting code with Prettier..." "$PURPLE"
    
    if pnpm prettier --write .; then
        log "SUCCESS" "Code formatted successfully" "$GREEN"
    else
        log "ERROR" "Code formatting failed" "$RED"
        exit 1
    fi
}

# Lint code
lint_code() {
    log "STEP" "Linting code..." "$PURPLE"
    
    if pnpm lint; then
        log "SUCCESS" "Code linting passed" "$GREEN"
    else
        log "ERROR" "Code linting failed" "$RED"
        exit 1
    fi
}

# Type check
type_check() {
    log "STEP" "Running TypeScript type check..." "$PURPLE"
    
    if pnpm typecheck; then
        log "SUCCESS" "TypeScript type check passed" "$GREEN"
    else
        log "ERROR" "TypeScript type check failed" "$RED"
        exit 1
    fi
}

# Run test setup
run_test_setup() {
    log "STEP" "Running test setup..." "$PURPLE"
    
    if pnpm test:setup; then
        log "SUCCESS" "Test setup completed successfully" "$GREEN"
    else
        log "ERROR" "Test setup failed" "$RED"
        exit 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    log "STEP" "Running E2E tests..." "$PURPLE"
    
    if pnpm e2e; then
        log "SUCCESS" "E2E tests passed" "$GREEN"
    else
        log "ERROR" "E2E tests failed" "$RED"
        exit 1
    fi
}

# Run unit tests
run_unit_tests() {
    log "STEP" "Running unit tests..." "$PURPLE"
    
    if pnpm test; then
        log "SUCCESS" "Unit tests passed" "$GREEN"
    fi
}

# Run visual regression tests
run_visual_tests() {
    log "STEP" "Running visual regression tests..." "$PURPLE"
    
    if pnpm test:visual; then
        log "SUCCESS" "Visual regression tests passed" "$GREEN"
    else
        log "ERROR" "Visual regression tests failed" "$RED"
        exit 1
    fi
}

# Run performance tests
run_performance_tests() {
    log "STEP" "Running performance tests..." "$PURPLE"
    
    if pnpm test:performance; then
        log "SUCCESS" "Performance tests passed" "$GREEN"
    else
        log "ERROR" "Performance tests failed" "$RED"
        exit 1
    fi
}

# Build application
build_application() {
    log "STEP" "Building application..." "$PURPLE"
    
    if pnpm build; then
        log "SUCCESS" "Application built successfully" "$GREEN"
    else
        log "ERROR" "Application build failed" "$RED"
        exit 1
    fi
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    log "STEP" "🚀 WorkloadWizard CI Recipe" "$CYAN"
    log "INFO" "Starting complete CI workflow..." "$BLUE"
    echo ""
    
    # Execute CI workflow
    check_prerequisites
    load_env
    install_dependencies
    format_code
    lint_code
    type_check
    start_services
    run_test_setup
    run_e2e_tests
    run_unit_tests
    run_visual_tests
    run_performance_tests
    build_application
    
    # Calculate execution time
    local end_time=$(date +%s)
    local execution_time=$((end_time - start_time))
    
    echo ""
    log "STEP" "🎉 CI Recipe Completed Successfully!" "$GREEN"
    log "INFO" "Total execution time: ${execution_time} seconds" "$BLUE"
    log "INFO" "All test suites passed" "$GREEN"
    log "INFO" "Application built successfully" "$GREEN"
    
    if $SERVICES_STARTED; then
        log "INFO" "Services are still running. Use Ctrl+C to stop them." "$YELLOW"
        log "INFO" "Or run: $0 --skip-services to run tests without starting services" "$BLUE"
    fi
}

# Run main function
main "$@"
