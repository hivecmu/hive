### Backend Services: Determinism for tests

- Ensure `USE_REAL_AI=false` in tests (already set in `tests/setup.ts`) to use built-in mock AI paths.
- Optionally stub AI explicitly per test for full determinism:
  - Structure proposal: fixed channels `["general","announcements","random"]`, fixed rationale.
  - Embeddings: fixed 768-d vector (e.g., `Array(768).fill(0.1)`).
  - File tags: fixed tags `["workstreams/app-redesign"]`, confidence `0.9`.
- Freeze time in tests that compare timestamps using Jest fake timers and `setSystemTime` to a constant ISO date.

Example (Jest):

```ts
jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
jest.mock('@core/ai/AIService', () => ({
  aiService: {
    generateStructure: jest.fn().mockResolvedValue({ ok: true, value: {
      channels: [
        { name: 'general', description: 'General', type: 'core', isPrivate: false },
        { name: 'announcements', description: 'Announcements', type: 'core', isPrivate: false },
        { name: 'random', description: 'Random', type: 'core', isPrivate: false },
      ],
      committees: [],
      rationale: 'deterministic',
      estimatedComplexity: 'simple',
    }}),
    generateFileTags: jest.fn().mockResolvedValue({ ok: true, value: {
      tags: ['workstreams/app-redesign'], category: 'engineering', confidence: 0.9, summary: 'deterministic'
    }}),
    generateEmbeddings: jest.fn().mockResolvedValue({ ok: true, value: [Array(768).fill(0.1)] }),
  }
}));
```


### Backend: backend/src/domains/structure/StructureService.ts

- Functions under test:
  - createJob(workspaceId, userId, intakeForm)
  - generateProposal(jobId)
  - getJob(jobId)
  - getLatestProposal(jobId)
  - applyProposal(jobId, workspaceId)
  - updateJobStatus(jobId, status) [private]
  - calculateScore(proposal, context) [private]
  - rowToJob(row) [private]

| Function | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Persists job and intake | wsId, userId, valid intake | Ok(StructureJob) status='created', intake row exists |
| createJob | DB failure path | Force transaction error | Err Issues.internal('Failed to create job') |
| generateProposal | Saves v1 proposal, sets status=proposed | jobId with intake, AI mocked Ok | Ok(ProposalRecord v1 with score in [0,1]); status updated to 'proposed' |
| generateProposal | Missing job | jobId not found | Err Issues.notFound('Job', jobId) |
| generateProposal | AI error marks job failed | AI mocked Err | Err passthrough; status updated to 'failed' |
| getJob | Returns job | existing jobId | Ok(StructureJob) |
| getJob | Not found | missing jobId | Err Issues.notFound('Job', jobId) |
| getLatestProposal | Highest version wins | job with v1..v3 present | Ok ProposalRecord with version 3 |
| getLatestProposal | None present | jobId with no proposals | Err Issues.notFound('Proposal for job', jobId) |
| applyProposal | Creates channels, committees, blueprint, sets applied | jobId, wsId, none exist | Ok({ created: n }); status='applied' |
| applyProposal | Idempotent channel creation | Two channels already exist | Ok({ created: remaining }) |
| applyProposal | Missing proposal | job without proposal | Err passthrough; status='failed' |
| updateJobStatus | Updates status | jobId, 'failed' | Row shows status='failed' after call |
| calculateScore | In budget with core channels | Proposal ≤ budget, includes general and announcements | Score > base, ≤ 1.0 |
| calculateScore | Over budget reduces score | Proposal > budget | Score excludes budget bonus |
| rowToJob | Maps DB row correctly | snake_case row | StructureJob with camelCase fields and Date instances |


### Backend: backend/src/domains/filehub/FileHubService.ts

- Functions under test:
  - createJob(workspaceId, userId)
  - addFile(workspaceId, sourceId, fileData)
  - tagFile(fileId)
  - indexFile(fileId)
  - search(workspaceId, query)
  - getJob(jobId)
  - rowToJob(row) [private]
  - rowToFile(row) [private]

| Function | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Creates file job | wsId, userId | Ok(FileJob) status='created' |
| createJob | DB failure path | Force error | Err Issues.internal('Failed to create file job') |
| addFile | Inserts with content hash | content Buffer('abc') | Ok(FileRecord) with contentHash set |
| addFile | Duplicate hash detected non-blocking | Preexisting same hash | Ok(FileRecord) inserted, duplicate logged |
| addFile | Inserts without content | no content | Ok(FileRecord) contentHash null |
| addFile | DB failure path | Force error | Err Issues.internal('Failed to add file') |
| tagFile | Persists AI tags | fileId exists, AI mocked Ok | Ok(FileRecord) tags updated |
| tagFile | Missing file | invalid fileId | Err Issues.notFound('File', fileId) |
| tagFile | AI error passthrough | AI mocked Err | Err passthrough |
| indexFile | Upsert vector and mark indexed | fileId exists, embeddings mocked | Ok(undefined); file_index row exists; files.indexed=true |
| indexFile | Missing file | invalid fileId | Err Issues.notFound('File', fileId) |
| indexFile | AI error passthrough | embeddings mocked Err | Err passthrough |
| search | Filters and limit applied | q, tags, mimeType, channelId, limit | Ok(FileRecord[]) limited and filtered |
| search | No matches returns empty | unmatched query | Ok([]) |
| search | DB failure path | Force error | Err Issues.internal('Search failed') |
| getJob | Returns job | existing jobId | Ok(FileJob) |
| getJob | Not found | missing jobId | Err Issues.notFound('File job', jobId) |
| rowToJob | Maps DB row | snake_case row | FileJob with Dates mapped |
| rowToFile | Maps DB row, defaults tags | row with tags null | FileRecord.tags is [] |


### Backend Routes: backend/src/http/routes/structure.ts

- Handlers under test:
  - POST /v1/structure/generate
  - GET /v1/structure/jobs/:jobId
  - POST /v1/structure/proposals/:jobId/approve

| Handler | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| POST /v1/structure/generate | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| POST /v1/structure/generate | 422 validation error | Missing required body fields | 422 with { ok:false, issues:[...] } |
| POST /v1/structure/generate | 403 not a member | Auth ok, isMember=false | 403 with { ok:false, issues[0].code='FORBIDDEN' } |
| POST /v1/structure/generate | 201 success | Auth ok, valid body, AI mocked Ok | 201 with { ok:true, value:{ job, proposal } } |
| GET /v1/structure/jobs/:jobId | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| GET /v1/structure/jobs/:jobId | 422 invalid param | Non-UUID jobId | 422 with { ok:false, issues:[...] } |
| GET /v1/structure/jobs/:jobId | 404 not found | Unknown jobId | 404 with { ok:false, issues[0].code='NOT_FOUND' } |
| GET /v1/structure/jobs/:jobId | 200 success | Existing jobId | 200 with { ok:true, value:{ job, proposal|null } } |
| POST /v1/structure/proposals/:jobId/approve | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| POST /v1/structure/proposals/:jobId/approve | 422 invalid param | Non-UUID jobId | 422 with { ok:false, issues:[...] } |
| POST /v1/structure/proposals/:jobId/approve | 403 not admin | Auth ok, role!='admin' | 403 with { ok:false, issues[0].code='FORBIDDEN' } |
| POST /v1/structure/proposals/:jobId/approve | 404 missing job | Unknown jobId | 404 with { ok:false, issues[0].code='NOT_FOUND' } |
| POST /v1/structure/proposals/:jobId/approve | 200 success | Admin, valid job | 200 with { ok:true, value:{ jobId, status:'applied', channelsCreated:number } } |


### Backend Routes: backend/src/http/routes/filehub.ts

- Handlers under test:
  - POST /v1/workspaces/:workspaceId/files/sync
  - GET /v1/files/search
  - POST /v1/files/:fileId/tag
  - POST /v1/files/:fileId/index

| Handler | Test Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| POST /v1/workspaces/:workspaceId/files/sync | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| POST /v1/workspaces/:workspaceId/files/sync | 422 invalid param | workspaceId not UUID | 422 with { ok:false, issues:[...] } |
| POST /v1/workspaces/:workspaceId/files/sync | 403 not a member | isMember=false | 403 with { ok:false, issues[0].code='FORBIDDEN' } |
| POST /v1/workspaces/:workspaceId/files/sync | 201 success | isMember=true | 201 with { ok:true, value: FileJob } |
| GET /v1/files/search | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| GET /v1/files/search | 422 invalid query | Bad query types | 422 with { ok:false, issues:[...] } |
| GET /v1/files/search | 200 success | Valid params | 200 with { ok:true, value: FileRecord[] } |
| POST /v1/files/:fileId/tag | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| POST /v1/files/:fileId/tag | 422 invalid param | fileId not UUID | 422 with { ok:false, issues:[...] } |
| POST /v1/files/:fileId/tag | 404 not found | Unknown fileId | 404 with { ok:false, issues[0].code='NOT_FOUND' } |
| POST /v1/files/:fileId/tag | 200 success | Existing file | 200 with { ok:true, value: FileRecord } |
| POST /v1/files/:fileId/index | 401 unauthorized | No Authorization | 401 with { ok:false, issues:[...] } |
| POST /v1/files/:fileId/index | 422 invalid param | fileId not UUID | 422 with { ok:false, issues:[...] } |
| POST /v1/files/:fileId/index | 404 not found | Unknown fileId | 404 with { ok:false, issues[0].code='NOT_FOUND' } |
| POST /v1/files/:fileId/index | 200 success | Existing file | 200 with { ok:true, value:{ indexed:true } } |


