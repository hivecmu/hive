# Testing Guide for Hive Platform

This guide explains how to run tests, linting, and quality checks locally before pushing to GitHub.

## Table of Contents
- [Quick Start](#quick-start)
- [Understanding the Testing Stack](#understanding-the-testing-stack)
- [Running Tests Locally](#running-tests-locally)
- [Understanding GitHub Actions](#understanding-github-actions)
- [About the Core Tests](#about-the-core-tests)

## Quick Start

Run all quality checks at once:

```bash
# From the hive-platform directory:

# Run tests
npm test

# Run linter
npm run lint

# Run type checker
npm run type-check

# Run all three together
npm test && npm run lint && npm run type-check
```

## Understanding the Testing Stack

### What is Jest?
**Jest** is a JavaScript testing framework. It runs your test files and verifies that your code behaves correctly.

- **Why use it?** Catches bugs early, documents expected behavior, gives confidence when refactoring
- **Test files:** Any file ending in `.test.ts` or `.test.tsx`
- **Example:** `lib/mockDb.test.ts` tests the MockDatabaseService

### What is ESLint?
**ESLint** is a code linter that checks your code for style issues and potential bugs.

- **Why use it?** Maintains consistent code style, catches common mistakes, enforces best practices
- **Config file:** `eslint.config.mjs`
- **Can fix issues automatically:** `npm run lint:fix`

### What is TypeScript Checking?
**TypeScript** is a typed superset of JavaScript. The type checker ensures all your types are correct.

- **Why use it?** Prevents type-related bugs (like passing a string when a number is expected)
- **Config file:** `tsconfig.json`
- **Runs during build:** Next.js automatically checks types during `npm run build`

## Running Tests Locally

### Run All Tests
```bash
npm test
```

This runs all test files once and shows you the results.

### Watch Mode (Recommended for Development)
```bash
npm run test:watch
```

This watches your files and re-runs tests automatically when you save changes. Great for TDD (Test-Driven Development).

### Generate Coverage Report
```bash
npm run test:coverage
```

This shows which parts of your code are covered by tests. Coverage report is saved to `coverage/` directory.

### Run a Specific Test File
```bash
npm test -- lib/mockDb.test.ts
```

### Run Tests Matching a Pattern
```bash
npm test -- --testNamePattern="should create"
```

## Running Linter

### Check for Issues
```bash
npm run lint
```

This checks all files for linting issues.

### Auto-Fix Issues
```bash
npm run lint:fix
```

This automatically fixes issues that can be fixed (like formatting, unused imports, etc.).

## Running Type Check

```bash
npm run type-check
```

This runs the TypeScript compiler in check-only mode (no output files generated).

## Understanding GitHub Actions

### What is GitHub Actions?

**GitHub Actions** is a CI/CD (Continuous Integration/Continuous Deployment) system built into GitHub. Think of it as an automated robot that runs your tests every time you push code.

### How It Works:

1. **You push code** to GitHub (or create a pull request)
2. **GitHub detects the push** and reads `.github/workflows/ci.yml`
3. **GitHub spins up a virtual machine** (fresh Ubuntu computer in the cloud)
4. **The VM runs your commands** (install dependencies, run tests, lint, type-check)
5. **You get results** - either ✅ (all passed) or ❌ (something failed)

### Where to See Results:

1. Go to your repository on GitHub
2. Click the "Actions" tab at the top
3. You'll see a list of all workflow runs
4. Click any run to see detailed results

### What Our Workflow Does:

Our CI workflow (`.github/workflows/ci.yml`) runs 3 jobs in parallel:

1. **Lint & Type Check**
   - Installs dependencies
   - Runs ESLint
   - Runs TypeScript type checking

2. **Run Tests**
   - Installs dependencies
   - Runs all Jest tests
   - Uploads coverage report

3. **Build Check**
   - Installs dependencies
   - Runs `npm run build` to ensure the app builds successfully

### When Does It Run?

- On every push to the `main` branch
- On every pull request to any branch
- Manually (you can trigger it from the Actions tab)

### Why Use CI?

- **Catches bugs early:** Tests run automatically before code is merged
- **Maintains quality:** Won't let broken code get merged
- **Saves time:** No need to manually run tests before every push
- **Collaboration:** Team members see test results on PRs
- **Confidence:** Know that code works before deploying

## About the Core Tests

We've written 2 comprehensive test suites that cover the most critical parts of the platform:

### 1. MockDatabaseService Tests (`lib/mockDb.test.ts`)

**Why this matters:** The MockDatabaseService is the backbone of the app's data layer. It manages all organization data in localStorage and handles critical operations like:
- Creating and switching between organizations
- Approving blueprints (which unlocks app features)
- Persisting data across sessions

**What we test:**
- ✅ Initialization with seed data
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Organization switching
- ✅ Blueprint approval flow (critical for app functionality)
- ✅ Data persistence to localStorage
- ✅ Loading from localStorage on subsequent visits

**46 test cases** covering all major scenarios and edge cases.

### 2. API Client Tests (`lib/api/client.test.ts`)

**Why this matters:** The API client handles all HTTP communication with the backend. Bugs here could cause:
- Auth failures
- Data corruption
- Silent errors that are hard to debug

**What we test:**
- ✅ Token management (storing/retrieving auth tokens)
- ✅ Request header construction
- ✅ Result envelope handling (type-safe error handling)
- ✅ Network error handling
- ✅ All API endpoints (workspaces, messages, structure, etc.)

**Multiple test cases** covering authentication, HTTP requests, error handling, and all API methods.

## Writing New Tests

When adding new features, follow this pattern:

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  it('should do something specific', () => {
    // Arrange: Set up test data
    const input = 'test data'

    // Act: Call the function
    const result = myFunction(input)

    // Assert: Check the result
    expect(result).toBe('expected output')
  })
})
```

## Troubleshooting

### Tests Failing Locally

1. Make sure dependencies are installed: `npm install`
2. Clear Jest cache: `npm test -- --clearCache`
3. Check for typos in test files
4. Read the error message carefully - Jest gives helpful error messages

### Linter Issues

1. Try auto-fixing: `npm run lint:fix`
2. Check the error message for the rule name (e.g., `@typescript-eslint/no-unused-vars`)
3. Either fix the issue or suppress it with `// eslint-disable-next-line rule-name`

### Type Errors

1. Check the error message location
2. Make sure imports are correct
3. Check TypeScript documentation for the type you're using

### GitHub Actions Failing

1. Check the "Actions" tab on GitHub
2. Click the failed run
3. Click the failed job
4. Read the error logs - they're usually very clear
5. Reproduce the failure locally by running the same commands

## Best Practices

1. **Run tests before pushing:** `npm test && npm run lint`
2. **Write tests for new features:** Don't skip testing!
3. **Keep tests focused:** One test should test one thing
4. **Use descriptive test names:** "should create organization" is better than "test1"
5. **Mock external dependencies:** Don't hit real APIs in tests
6. **Test edge cases:** Empty inputs, null values, error conditions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Questions?

If you have questions about testing, check:
1. This guide
2. The test files themselves (they're well-commented)
3. The Jest documentation
4. Ask a team member
