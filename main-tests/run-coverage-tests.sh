#!/bin/bash

# Coverage Test Runner Script
# This script runs all tests with coverage and generates detailed logs

echo "============================================"
echo "     HIVE PLATFORM COVERAGE TEST RUNNER    "
echo "============================================"
echo ""

# Set timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="coverage-logs"
COVERAGE_DIR="coverage"

# Create directories if they don't exist
mkdir -p "$LOG_DIR"
mkdir -p "$COVERAGE_DIR"

# Set log file
LOG_FILE="$LOG_DIR/coverage_run_${TIMESTAMP}.log"
SUMMARY_FILE="$LOG_DIR/coverage_summary_${TIMESTAMP}.txt"

# Function to log messages
log_message() {
    echo "$1" | tee -a "$LOG_FILE"
}

# Function to log section headers
log_section() {
    echo "" | tee -a "$LOG_FILE"
    echo "----------------------------------------" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "----------------------------------------" | tee -a "$LOG_FILE"
}

# Start logging
log_message "Coverage Test Run Started: $(date)"
log_message "Log file: $LOG_FILE"

# Check if npm packages are installed
log_section "Checking Dependencies"
if [ ! -d "node_modules" ]; then
    log_message "Installing dependencies..."
    npm install 2>&1 | tee -a "$LOG_FILE"
else
    log_message "Dependencies already installed"
fi

# Clean previous coverage data
log_section "Cleaning Previous Coverage Data"
rm -rf coverage/* 2>/dev/null
log_message "Previous coverage data cleaned"

# Run tests with coverage
log_section "Running Tests with Coverage"
log_message "Executing: npm run test:verbose"

# Run tests and capture output
npm run test:verbose 2>&1 | tee -a "$LOG_FILE"
TEST_EXIT_CODE=${PIPESTATUS[0]}

# Check if tests passed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    log_message "✅ All tests passed successfully!"
else
    log_message "❌ Some tests failed. Exit code: $TEST_EXIT_CODE"
fi

# Generate coverage analysis
log_section "Generating Coverage Analysis"
node analyze-coverage.js 2>&1 | tee -a "$LOG_FILE"

# Generate summary
log_section "Coverage Summary"
{
    echo "COVERAGE TEST RUN SUMMARY"
    echo "========================"
    echo "Date: $(date)"
    echo "Test Exit Code: $TEST_EXIT_CODE"
    echo ""

    if [ -f "coverage/coverage-summary.json" ]; then
        echo "Coverage Metrics:"
        echo "-----------------"
        node -e "
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const total = summary.total;

            console.log('Lines:      ' + total.lines.pct.toFixed(2) + '% (' + total.lines.covered + '/' + total.lines.total + ')');
            console.log('Statements: ' + total.statements.pct.toFixed(2) + '% (' + total.statements.covered + '/' + total.statements.total + ')');
            console.log('Functions:  ' + total.functions.pct.toFixed(2) + '% (' + total.functions.covered + '/' + total.functions.total + ')');
            console.log('Branches:   ' + total.branches.pct.toFixed(2) + '% (' + total.branches.covered + '/' + total.branches.total + ')');
        " 2>&1
    fi

    echo ""
    echo "Test Files:"
    echo "-----------"
    ls -1 *.test.{ts,tsx} 2>/dev/null | while read file; do
        echo "  - $file"
    done

    echo ""
    echo "Coverage Reports Generated:"
    echo "--------------------------"
    echo "  - HTML Report: coverage/index.html"
    echo "  - LCOV Report: coverage/lcov.info"
    echo "  - JSON Report: coverage/coverage-final.json"
    echo "  - Main Report: COVERAGE_REPORT.md"

} | tee "$SUMMARY_FILE"

# Display summary
echo ""
log_section "Test Run Complete"
log_message "Summary saved to: $SUMMARY_FILE"
log_message "Full log saved to: $LOG_FILE"
log_message "Coverage reports available in: $COVERAGE_DIR/"

# Open HTML report if on macOS
if [ "$(uname)" == "Darwin" ] && [ -f "coverage/index.html" ]; then
    log_message ""
    log_message "Opening HTML coverage report in browser..."
    open coverage/index.html
fi

echo ""
echo "============================================"
echo "         COVERAGE TEST RUN COMPLETE         "
echo "============================================"

exit $TEST_EXIT_CODE