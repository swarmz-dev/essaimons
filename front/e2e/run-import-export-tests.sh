#!/bin/bash

# Script to run proposition import/export E2E tests
# This script helps set up and run tests with proper environment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Proposition Import/Export E2E Test Runner ===${NC}\n"

# Check if we're in the front directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from the front/ directory${NC}"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s http://127.0.0.1:3333 > /dev/null 2>&1; then
    echo -e "${RED}Backend is not running on port 3333!${NC}"
    echo -e "${YELLOW}Please start the backend server:${NC}"
    echo -e "  cd back && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}\n"

# Parse command line arguments
TEST_ARGS=""
HEADED=""
DEBUG=""
GREP_PATTERN=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADED="--headed"
            shift
            ;;
        --debug)
            DEBUG="--debug"
            shift
            ;;
        --ui)
            TEST_ARGS="$TEST_ARGS --ui"
            shift
            ;;
        --grep|-g)
            GREP_PATTERN="$2"
            shift 2
            ;;
        --reporter)
            TEST_ARGS="$TEST_ARGS --reporter=$2"
            shift 2
            ;;
        *)
            TEST_ARGS="$TEST_ARGS $1"
            shift
            ;;
    esac
done

# Build the frontend if needed
echo -e "${YELLOW}Building frontend...${NC}"
npm run build || {
    echo -e "${RED}Frontend build failed!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend built successfully${NC}\n"

# Run the tests
echo -e "${YELLOW}Running E2E tests...${NC}\n"

if [ -n "$GREP_PATTERN" ]; then
    echo -e "${YELLOW}Running tests matching: ${GREP_PATTERN}${NC}\n"
    PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts \
        --grep "$GREP_PATTERN" \
        $HEADED \
        $DEBUG \
        $TEST_ARGS
else
    PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts \
        $HEADED \
        $DEBUG \
        $TEST_ARGS
fi

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    echo -e "${YELLOW}To view the test report:${NC}"
    echo -e "  npx playwright show-report"
fi

exit $TEST_EXIT_CODE
