#!/bin/bash

# Simple Coverage Test Runner for the 4 test files
# This script runs each test with coverage and generates logs

echo "============================================"
echo "     COVERAGE TEST RUNNER - MAIN TESTS     "
echo "============================================"
echo ""

# Set timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="coverage-logs"
COVERAGE_DIR="coverage"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$COVERAGE_DIR"

# Main coverage log file
MAIN_LOG="$LOG_DIR/coverage_main_${TIMESTAMP}.log"
COVERAGE_SUMMARY="$LOG_DIR/coverage_summary_${TIMESTAMP}.txt"

# Function to log messages
log_message() {
    echo "$1" | tee -a "$MAIN_LOG"
}

# Start logging
log_message "Coverage Test Run Started: $(date)"
log_message ""

# Arrays for test files and their names
TEST_FILES=(
    "CommunityWizard.test.tsx"
    "FileHubService.test.ts"
    "HubDashboard.test.tsx"
    "StructureService.test.ts"
)

# Counter for results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Coverage accumulator
declare -A COVERAGE_DATA

# Function to extract coverage numbers from output
extract_coverage() {
    local output="$1"
    local metric="$2"
    echo "$output" | grep -oE "${metric}[[:space:]]*:[[:space:]]*[0-9.]+" | grep -oE "[0-9.]+" | tail -1
}

# Run each test file with coverage
for TEST_FILE in "${TEST_FILES[@]}"; do
    log_message "----------------------------------------"
    log_message "Testing: $TEST_FILE"
    log_message "----------------------------------------"

    # Create individual log file
    TEST_LOG="$LOG_DIR/${TEST_FILE%.*}_coverage_${TIMESTAMP}.log"

    # Check if test file exists
    if [ ! -f "$TEST_FILE" ]; then
        log_message "❌ Test file not found: $TEST_FILE"
        ((FAILED_TESTS++))
        continue
    fi

    # Get the backend path for running tests
    BACKEND_PATH="/Users/akeilsmith/hive-2/backend"

    # Copy test file temporarily to backend test directory for proper module resolution
    TEST_NAME="${TEST_FILE%.*}"

    # Run the test based on its original location
    if [[ "$TEST_FILE" == "StructureService.test.ts" ]]; then
        log_message "Running backend test: $TEST_FILE"

        # Run from backend directory
        cd "$BACKEND_PATH"
        OUTPUT=$(npm test -- --coverage --coverageReporters=text tests/domains/structure/StructureService.test.ts 2>&1)
        TEST_EXIT_CODE=$?
        cd - > /dev/null

    elif [[ "$TEST_FILE" == "FileHubService.test.ts" ]]; then
        log_message "Running backend test: $TEST_FILE"

        # Run from backend directory
        cd "$BACKEND_PATH"
        OUTPUT=$(npm test -- --coverage --coverageReporters=text tests/domains/filehub/FileHubService.test.ts 2>&1)
        TEST_EXIT_CODE=$?
        cd - > /dev/null

    else
        # For frontend tests
        log_message "Running frontend test: $TEST_FILE"

        FRONTEND_PATH="/Users/akeilsmith/hive-2/hive-platform"
        cd "$FRONTEND_PATH"

        if [[ "$TEST_FILE" == "CommunityWizard.test.tsx" ]]; then
            OUTPUT=$(npm test -- --coverage --coverageReporters=text components/features/wizard/CommunityWizard.test.tsx 2>&1)
        else
            OUTPUT=$(npm test -- --coverage --coverageReporters=text components/features/file-hub/HubDashboard.test.tsx 2>&1)
        fi
        TEST_EXIT_CODE=$?
        cd - > /dev/null
    fi

    # Save output to individual log
    echo "$OUTPUT" > "$TEST_LOG"

    # Check if test passed
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_message "✅ Test passed: $TEST_FILE"
        ((PASSED_TESTS++))

        # Extract coverage metrics
        LINES=$(extract_coverage "$OUTPUT" "Lines")
        BRANCHES=$(extract_coverage "$OUTPUT" "Branches")
        FUNCTIONS=$(extract_coverage "$OUTPUT" "Functions")
        STATEMENTS=$(extract_coverage "$OUTPUT" "Statements")

        # Store coverage data
        COVERAGE_DATA["${TEST_NAME}_lines"]=$LINES
        COVERAGE_DATA["${TEST_NAME}_branches"]=$BRANCHES
        COVERAGE_DATA["${TEST_NAME}_functions"]=$FUNCTIONS
        COVERAGE_DATA["${TEST_NAME}_statements"]=$STATEMENTS

        log_message "   Coverage: Lines: ${LINES}% | Branches: ${BRANCHES}% | Functions: ${FUNCTIONS}% | Statements: ${STATEMENTS}%"

        # Extract test counts
        TESTS_RUN=$(echo "$OUTPUT" | grep -oE "Tests:.*passed" | grep -oE "[0-9]+ passed" | grep -oE "[0-9]+")
        if [ ! -z "$TESTS_RUN" ]; then
            TOTAL_TESTS=$((TOTAL_TESTS + TESTS_RUN))
            log_message "   Tests run: $TESTS_RUN"
        fi

    else
        log_message "❌ Test failed: $TEST_FILE"
        ((FAILED_TESTS++))

        # Log error details
        ERROR_MSG=$(echo "$OUTPUT" | grep -A 5 "FAIL\|Error" | head -10)
        log_message "   Error preview: ${ERROR_MSG}"
    fi

    log_message ""
done

# Generate summary
{
    echo "========================================"
    echo "       COVERAGE TEST SUMMARY"
    echo "========================================"
    echo ""
    echo "Date: $(date)"
    echo "Test Files: ${#TEST_FILES[@]}"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Total Tests Run: $TOTAL_TESTS"
    echo ""
    echo "Coverage Results by File:"
    echo "------------------------"

    for TEST_FILE in "${TEST_FILES[@]}"; do
        TEST_NAME="${TEST_FILE%.*}"

        if [ ! -z "${COVERAGE_DATA[${TEST_NAME}_lines]}" ]; then
            echo ""
            echo "$TEST_FILE:"
            echo "  Lines:      ${COVERAGE_DATA[${TEST_NAME}_lines]}%"
            echo "  Branches:   ${COVERAGE_DATA[${TEST_NAME}_branches]}%"
            echo "  Functions:  ${COVERAGE_DATA[${TEST_NAME}_functions]}%"
            echo "  Statements: ${COVERAGE_DATA[${TEST_NAME}_statements]}%"
        else
            echo ""
            echo "$TEST_FILE: No coverage data (test may have failed)"
        fi
    done

    echo ""
    echo "Log Files:"
    echo "----------"
    echo "Main log: $MAIN_LOG"
    echo "Summary: $COVERAGE_SUMMARY"
    echo ""
    echo "Individual test logs:"
    for TEST_FILE in "${TEST_FILES[@]}"; do
        echo "  - $LOG_DIR/${TEST_FILE%.*}_coverage_${TIMESTAMP}.log"
    done

} | tee "$COVERAGE_SUMMARY"

# Display summary
echo ""
log_message "========================================"
log_message "     COVERAGE TEST RUN COMPLETE"
log_message "========================================"
log_message ""
log_message "Summary saved to: $COVERAGE_SUMMARY"
log_message "Coverage logs directory: $LOG_DIR/"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi