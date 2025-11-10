#!/bin/bash

# Generate coverage logs for backend tests

echo "============================================"
echo "     GENERATING COVERAGE LOGS"
echo "============================================"
echo ""

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="coverage-logs"
mkdir -p "$LOG_DIR"

BACKEND_DIR="/Users/akeilsmith/hive-2/backend"
cd "$BACKEND_DIR"

echo "Running StructureService tests with coverage..."
npm test -- --coverage --coverageReporters=text tests/domains/structure/StructureService.test.ts 2>&1 | tee "/Users/akeilsmith/hive-2/main-tests/$LOG_DIR/StructureService_coverage_$TIMESTAMP.log"

echo ""
echo "Running FileHubService tests with coverage..."
npm test -- --coverage --coverageReporters=text tests/domains/filehub/FileHubService.test.ts 2>&1 | tee "/Users/akeilsmith/hive-2/main-tests/$LOG_DIR/FileHubService_coverage_$TIMESTAMP.log"

echo ""
echo "Running all backend tests with full coverage report..."
npm test -- --coverage --coverageReporters=text --coverageReporters=lcov --coverageReporters=html 2>&1 | tee "/Users/akeilsmith/hive-2/main-tests/$LOG_DIR/backend_full_coverage_$TIMESTAMP.log"

# Copy coverage reports to main-tests
if [ -d "coverage" ]; then
    cp -r coverage "/Users/akeilsmith/hive-2/main-tests/"
    echo ""
    echo "Coverage reports copied to /Users/akeilsmith/hive-2/main-tests/coverage/"
fi

# Generate summary
cd "/Users/akeilsmith/hive-2/main-tests"

{
    echo "COVERAGE LOG SUMMARY"
    echo "===================="
    echo "Generated: $(date)"
    echo ""
    echo "Coverage Logs Created:"
    echo "---------------------"
    ls -la "$LOG_DIR"/*coverage*.log 2>/dev/null | while read line; do
        echo "  $(basename $(echo $line | awk '{print $NF}'))"
    done
    echo ""
    echo "To view coverage logs:"
    echo "  cat $LOG_DIR/StructureService_coverage_$TIMESTAMP.log"
    echo "  cat $LOG_DIR/FileHubService_coverage_$TIMESTAMP.log"
    echo "  cat $LOG_DIR/backend_full_coverage_$TIMESTAMP.log"
    echo ""
    echo "HTML Coverage Report:"
    echo "  open coverage/index.html"
} | tee "$LOG_DIR/coverage_summary_$TIMESTAMP.txt"

echo ""
echo "✅ Coverage logs generated successfully!"
echo "   Location: /Users/akeilsmith/hive-2/main-tests/$LOG_DIR/"