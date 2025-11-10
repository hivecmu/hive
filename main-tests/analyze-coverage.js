#!/usr/bin/env node

/**
 * Coverage Analysis Script
 * Analyzes test coverage results and generates detailed reports
 */

const fs = require('fs');
const path = require('path');

// Paths
const coverageDir = path.join(__dirname, 'coverage');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const coverageLogsDir = path.join(__dirname, 'coverage-logs');
const reportPath = path.join(__dirname, 'COVERAGE_REPORT.md');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Function to get color based on percentage
function getColor(percentage) {
  if (percentage >= 80) return colors.green;
  if (percentage >= 60) return colors.yellow;
  return colors.red;
}

// Function to format percentage
function formatPercentage(value, total) {
  if (total === 0) return '0.00%';
  return ((value / total) * 100).toFixed(2) + '%';
}

// Main analysis function
async function analyzeCoverage() {
  console.log(`${colors.cyan}${colors.bright}=== Coverage Analysis Report ===${colors.reset}`);
  console.log(`Generated: ${new Date().toISOString()}\n`);

  // Check if coverage data exists
  if (!fs.existsSync(coverageSummaryPath)) {
    console.error(`${colors.red}Error: Coverage summary not found. Run tests with coverage first.${colors.reset}`);
    process.exit(1);
  }

  // Read coverage summary
  const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));

  // Initialize report content
  let reportContent = `# Code Coverage Report\n\n`;
  reportContent += `**Generated:** ${new Date().toISOString()}\n\n`;
  reportContent += `## Summary\n\n`;

  // Global coverage
  const global = coverageSummary.total;

  console.log(`${colors.bright}Global Coverage:${colors.reset}`);
  reportContent += `### Global Coverage\n\n`;
  reportContent += `| Metric | Coverage | Details |\n`;
  reportContent += `|--------|----------|----------|\n`;

  const metrics = ['lines', 'statements', 'functions', 'branches'];

  metrics.forEach(metric => {
    const data = global[metric];
    const percentage = data.pct;
    const color = getColor(percentage);

    console.log(`  ${metric.padEnd(12)}: ${color}${percentage.toFixed(2)}%${colors.reset} (${data.covered}/${data.total})`);

    reportContent += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${percentage.toFixed(2)}% | ${data.covered}/${data.total} |\n`;
  });

  // File-by-file coverage
  console.log(`\n${colors.bright}File Coverage:${colors.reset}`);
  reportContent += `\n## File Coverage\n\n`;
  reportContent += `| File | Lines | Branches | Functions | Statements |\n`;
  reportContent += `|------|-------|----------|-----------|------------|\n`;

  // Sort files by path
  const files = Object.keys(coverageSummary)
    .filter(key => key !== 'total')
    .sort();

  files.forEach(filePath => {
    const fileCoverage = coverageSummary[filePath];
    const fileName = path.basename(filePath);

    console.log(`\n  ${colors.blue}${fileName}${colors.reset}`);

    let fileRow = `| ${fileName} |`;

    metrics.forEach(metric => {
      const data = fileCoverage[metric];
      const percentage = data.pct;
      const color = getColor(percentage);

      console.log(`    ${metric.padEnd(12)}: ${color}${percentage.toFixed(2)}%${colors.reset} (${data.covered}/${data.total})`);

      fileRow += ` ${percentage.toFixed(2)}% |`;
    });

    reportContent += fileRow + '\n';
  });

  // Uncovered lines analysis
  reportContent += `\n## Uncovered Code Analysis\n\n`;
  console.log(`\n${colors.bright}Uncovered Code Analysis:${colors.reset}`);

  const lcovPath = path.join(coverageDir, 'lcov.info');
  if (fs.existsSync(lcovPath)) {
    const lcovContent = fs.readFileSync(lcovPath, 'utf8');
    const uncoveredLines = parseLcov(lcovContent);

    Object.keys(uncoveredLines).forEach(file => {
      if (uncoveredLines[file].length > 0) {
        const fileName = path.basename(file);
        console.log(`  ${colors.yellow}${fileName}${colors.reset}: Lines ${uncoveredLines[file].join(', ')}`);
        reportContent += `- **${fileName}**: Lines ${uncoveredLines[file].join(', ')}\n`;
      }
    });
  }

  // Test execution logs
  reportContent += `\n## Test Execution Logs\n\n`;

  if (fs.existsSync(coverageLogsDir)) {
    const logFiles = fs.readdirSync(coverageLogsDir)
      .filter(f => f.endsWith('.log'))
      .sort()
      .slice(-5); // Get last 5 log files

    reportContent += `### Recent Test Runs\n\n`;
    logFiles.forEach(logFile => {
      reportContent += `- [${logFile}](coverage-logs/${logFile})\n`;
    });
  }

  // Coverage trends (if historical data exists)
  const trendsFile = path.join(__dirname, 'coverage-trends.json');
  let trends = [];

  if (fs.existsSync(trendsFile)) {
    trends = JSON.parse(fs.readFileSync(trendsFile, 'utf8'));
  }

  // Add current run to trends
  trends.push({
    timestamp: new Date().toISOString(),
    lines: global.lines.pct,
    branches: global.branches.pct,
    functions: global.functions.pct,
    statements: global.statements.pct
  });

  // Keep only last 10 runs
  if (trends.length > 10) {
    trends = trends.slice(-10);
  }

  fs.writeFileSync(trendsFile, JSON.stringify(trends, null, 2));

  // Add trends to report
  if (trends.length > 1) {
    reportContent += `\n## Coverage Trends\n\n`;
    reportContent += `### Last ${trends.length} Test Runs\n\n`;
    reportContent += `| Date | Lines | Branches | Functions | Statements |\n`;
    reportContent += `|------|-------|----------|-----------|------------|\n`;

    trends.forEach(trend => {
      const date = new Date(trend.timestamp).toLocaleDateString();
      reportContent += `| ${date} | ${trend.lines.toFixed(1)}% | ${trend.branches.toFixed(1)}% | ${trend.functions.toFixed(1)}% | ${trend.statements.toFixed(1)}% |\n`;
    });
  }

  // Recommendations
  reportContent += `\n## Recommendations\n\n`;
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);

  const recommendations = [];

  if (global.branches.pct < 80) {
    recommendations.push('- Increase branch coverage by testing more conditional paths');
  }
  if (global.functions.pct < 80) {
    recommendations.push('- Add tests for uncovered functions');
  }
  if (global.lines.pct < 80) {
    recommendations.push('- Improve line coverage to meet the 80% threshold');
  }

  if (recommendations.length === 0) {
    recommendations.push('- ✅ All coverage metrics meet the 80% threshold!');
    console.log(`  ${colors.green}✅ All coverage metrics meet the 80% threshold!${colors.reset}`);
  } else {
    recommendations.forEach(rec => {
      console.log(`  ${colors.yellow}${rec}${colors.reset}`);
    });
  }

  reportContent += recommendations.join('\n');

  // Write report to file
  fs.writeFileSync(reportPath, reportContent);
  console.log(`\n${colors.green}✅ Coverage report saved to: ${reportPath}${colors.reset}`);

  // Exit with appropriate code
  const allMetricsMet = metrics.every(metric => global[metric].pct >= 80);
  process.exit(allMetricsMet ? 0 : 1);
}

// Parse LCOV to find uncovered lines
function parseLcov(lcovContent) {
  const uncoveredLines = {};
  let currentFile = null;

  lcovContent.split('\n').forEach(line => {
    if (line.startsWith('SF:')) {
      currentFile = line.substring(3);
      uncoveredLines[currentFile] = [];
    } else if (line.startsWith('DA:') && currentFile) {
      const [lineNum, count] = line.substring(3).split(',');
      if (count === '0') {
        uncoveredLines[currentFile].push(lineNum);
      }
    }
  });

  return uncoveredLines;
}

// Run analysis
analyzeCoverage().catch(error => {
  console.error(`${colors.red}Error during coverage analysis:${colors.reset}`, error);
  process.exit(1);
});