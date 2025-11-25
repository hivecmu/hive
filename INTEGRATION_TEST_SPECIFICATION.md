# Integration Test Specification

## Overview

This document specifies the integration tests for the Hive Platform, covering all frontend-to-backend code pathways. Integration tests verify that the frontend and backend work correctly together through actual HTTP requests.

## Test Environment Configuration

- **Localhost**: `http://localhost:3001` (backend) + `http://localhost:3000` (frontend)
- **Cloud**: `http://hive-platform-alb-1542568641.us-east-1.elb.amazonaws.com/api`

---

## Functionality to Test

### 1. Authentication Flow
- User registration with email, password, and name
- User login with credentials
- Token-based authentication for protected routes
- Current user retrieval

### 2. Workspace Management
- Create new workspace
- List user's workspaces
- Get workspace details
- Update workspace
- Delete workspace

### 3. AI-Generated Workspace Structure (User Story 1)
- Submit intake form with community parameters
- Generate AI structure proposal
- Retrieve job status and proposal
- Approve proposal and create channels

### 4. AI-Driven File Hub (User Story 2)
- Search files with query parameters
- Create file sync job
- AI-generated file tagging
- File indexing for search

### 5. Messaging
- List channels in workspace
- Get channel details
- Send message to channel
- List messages in channel

### 6. Health Check
- System health status
- Liveness probe
- Readiness probe

---

## Test Table

| Test ID | Purpose | HTTP Method | Endpoint | Inputs | Expected Output |
|---------|---------|-------------|----------|--------|-----------------|
| **Authentication** |
| AUTH-01 | Register new user | POST | `/auth/register` | `{ email, password, name }` | 201, `{ ok: true, value: { user, token } }` |
| AUTH-02 | Reject duplicate email | POST | `/auth/register` | Same email as AUTH-01 | 400, `{ ok: false, issues: [{ code: 'CONFLICT' }] }` |
| AUTH-03 | Reject invalid email format | POST | `/auth/register` | `{ email: 'invalid', ... }` | 400, `{ ok: false, issues: [{ code: 'VALIDATION_ERROR' }] }` |
| AUTH-04 | Reject short password | POST | `/auth/register` | `{ password: 'short', ... }` | 400, `{ ok: false, issues: [{ code: 'VALIDATION_ERROR' }] }` |
| AUTH-05 | Login with valid credentials | POST | `/auth/login` | `{ email, password }` | 200, `{ ok: true, value: { user, token } }` |
| AUTH-06 | Reject invalid password | POST | `/auth/login` | `{ email, password: 'wrong' }` | 401, `{ ok: false, issues: [{ code: 'UNAUTHORIZED' }] }` |
| AUTH-07 | Reject non-existent user | POST | `/auth/login` | `{ email: 'none@test.com', ... }` | 401, `{ ok: false, issues: [{ code: 'UNAUTHORIZED' }] }` |
| AUTH-08 | Get current user with token | GET | `/auth/me` | Authorization header | 200, `{ ok: true, value: { id, email, name } }` |
| AUTH-09 | Reject missing token | GET | `/auth/me` | No header | 401, `{ ok: false, issues: [{ code: 'UNAUTHORIZED' }] }` |
| AUTH-10 | Reject invalid token | GET | `/auth/me` | Invalid Bearer token | 401, `{ ok: false, issues: [{ code: 'UNAUTHORIZED' }] }` |
| **Workspaces** |
| WS-01 | Create workspace | POST | `/v1/workspaces` | `{ name, slug, type }` + Auth | 201, `{ ok: true, value: { id, name, slug } }` |
| WS-02 | List workspaces | GET | `/v1/workspaces` | Auth header | 200, `{ ok: true, value: [...] }` |
| WS-03 | Get workspace by ID | GET | `/v1/workspaces/:id` | Auth header | 200, `{ ok: true, value: { id, name, ... } }` |
| WS-04 | Update workspace | PATCH | `/v1/workspaces/:id` | `{ name }` + Auth | 200, `{ ok: true, value: { ... } }` |
| WS-05 | Delete workspace | DELETE | `/v1/workspaces/:id` | Auth header | 204, No Content |
| WS-06 | Reject unauthenticated access | GET | `/v1/workspaces` | No header | 401, Unauthorized |
| **User Story 1: AI Structure Generation** |
| US1-01 | Generate structure proposal | POST | `/v1/structure/generate` | `{ workspaceId, communitySize, coreActivities, moderationCapacity, channelBudget }` + Auth | 201, `{ ok: true, value: { job, proposal } }` |
| US1-02 | Proposal includes channels | POST | `/v1/structure/generate` | Valid params | Response contains `proposal.channels` array |
| US1-03 | Proposal includes general channel | POST | `/v1/structure/generate` | Valid params | Channels array contains 'general' |
| US1-04 | Get job status | GET | `/v1/structure/jobs/:jobId` | Auth header | 200, `{ ok: true, value: { job, proposal } }` |
| US1-05 | Approve proposal | POST | `/v1/structure/proposals/:jobId/approve` | Auth header | 200, `{ ok: true, value: { status: 'applied', channelsCreated } }` |
| US1-06 | Reject non-member access | POST | `/v1/structure/generate` | Different user's token | 403, Forbidden |
| **User Story 2: AI File Hub** |
| US2-01 | Create file sync job | POST | `/v1/workspaces/:id/files/sync` | Auth header | 201, `{ ok: true, value: { jobId, status: 'created' } }` |
| US2-02 | Search files by query | GET | `/v1/files/search?q=design` | Auth header | 200, `{ ok: true, value: [...] }` |
| US2-03 | Search files by tags | GET | `/v1/files/search?tags=engineering` | Auth header | 200, `{ ok: true, value: [...] }` |
| US2-04 | Search files by mime type | GET | `/v1/files/search?mimeType=application/pdf` | Auth header | 200, `{ ok: true, value: [...] }` |
| US2-05 | Tag file with AI | POST | `/v1/files/:id/tag` | Auth header | 200, `{ ok: true, value: { tags: [...] } }` |
| US2-06 | Index file for search | POST | `/v1/files/:id/index` | Auth header | 200, `{ ok: true, value: { indexed: true } }` |
| **Messaging** |
| MSG-01 | List channels | GET | `/v1/workspaces/:id/channels` | Auth header | 200, `{ ok: true, value: [...] }` |
| MSG-02 | Get channel | GET | `/v1/channels/:id` | Auth header | 200, `{ ok: true, value: { id, name, ... } }` |
| MSG-03 | Send message | POST | `/v1/channels/:id/messages` | `{ content }` + Auth | 201, `{ ok: true, value: { id, content, ... } }` |
| MSG-04 | List messages | GET | `/v1/channels/:id/messages` | Auth header | 200, `{ ok: true, value: [...] }` |
| MSG-05 | Reject empty message | POST | `/v1/channels/:id/messages` | `{ content: '' }` | 400, Validation error |
| **Health Check** |
| HEALTH-01 | Full health check | GET | `/health` | None | 200, `{ ok: true, value: { status: 'ok' } }` |
| HEALTH-02 | Liveness probe | GET | `/health/live` | None | 200, `{ ok: true, value: { status: 'alive' } }` |
| HEALTH-03 | Readiness probe | GET | `/health/ready` | None | 200, `{ ok: true, value: { status: 'ready' } }` |

---

## Test Data

### Test User
```json
{
  "email": "integration-test@hive.test",
  "password": "IntegrationTest123!",
  "name": "Integration Test User"
}
```

### Test Workspace
```json
{
  "name": "Integration Test Workspace",
  "slug": "integration-test-ws",
  "type": "company"
}
```

### Structure Generation Parameters
```json
{
  "communitySize": "medium",
  "coreActivities": ["engineering", "design", "product"],
  "moderationCapacity": "moderate",
  "channelBudget": 15
}
```

---

## Environment-Specific Notes

### Tests that may behave differently in cloud vs localhost:
- **US1-01 to US1-05**: AI generation uses mock in localhost (`USE_REAL_AI=false`), real OpenAI in cloud
- **US2-05**: AI tagging uses mock locally
- **File operations**: Cloud uses real S3, localhost uses MinIO

### Tests to skip in specific environments:
- None currently identified; all tests should pass in both environments

---

## Running Tests

### Localhost
```bash
cd tests/integration
npm test
```

### Cloud
```bash
cd tests/integration
TEST_ENV=cloud npm test
```

