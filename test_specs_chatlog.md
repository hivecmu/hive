# User stories for repository implementation
_Exported on 11/7/2025 at 17:41:46 EST from Cursor (2.0.64)_

---

**Cursor**

I’m going to scan the repository for any documentation or references to “user stories” or “As a … I want …” to extract the two stories.

- AI-Generated Slack Workspace Structure: As a project team, we want Slack to use AI to automatically generate and create an optimized structure for workspaces, channels, and subgroups so that communication is organized, clear, and scalable from the start without requiring manual setup.
- AI-Driven Centralized File Hub: As a project team, we want Slack to design a centralized project file hub that integrates with the workspace structure, using channel and subgroup data to consolidate, deduplicate, tag, and make all project files searchable so that the team can easily find and manage files across the workspace.

Sources: `user_story_1_dev_spec.md`, `user_story_2_dev_spec.md`

---

**User**

please tell me your understanding of how these 2 user stories are implemented in this repo (both on frontend and backend)



"""

As a project manager, I want Slack to use AI to automatically generate and create an optimized structure for workspaces, channels, and subgroups so that communication is organized, clear, and scalable from the start without requiring manual setup.

As a project manager, I want Slack to design a centralized project file hub that integrates with the workspace structure, using channel and subgroup data to consolidate, deduplicate, tag, and make all project files searchable so that my team can easily find and manage files across the workspace.

"""

---

**Cursor**

I’m going to scan the repo structure and locate where the backend services (Generator, Validator, ApplyService, SlackGateway, JobService) and any frontend code live, so I can summarize how each story is implemented end-to-end.

I’m going to open the core backend files for both stories (services and routes) plus the shared AI service to see the concrete flow, inputs/outputs, and endpoints exposed.

I inspected the backend services, database migrations, HTTP routes, and the Next.js frontend components and API client to map both stories end-to-end.

### User Story 1 — AI-Generated Workspace Structure

- Backend
  - Structure flow: `createJob` → `generateProposal` (LLM) → score/save proposal → admin approval → `applyProposal` (creates channels/committees in DB; audit blueprint; update status).
  - Data model: `structure_jobs`, `intake_forms`, `proposals`, `blueprints`; status enum `created|proposed|validated|applying|applied|failed`.
  - AI: `AIService.generateStructure` builds a structured prompt and validates JSON against `structureSchema`. Mock mode supported via config.
  - API endpoints:
    - POST `/v1/structure/generate` (auth + Zod validation): creates job and immediately generates a proposal.
    - GET `/v1/structure/jobs/:jobId`: fetch job and latest proposal.
    - POST `/v1/structure/proposals/:jobId/approve`: admin-only, applies the blueprint into `channels` and `committees`.
- Frontend
  - Next.js app has an API client wired to these endpoints (`api.structure.generate/getJob/approve`) and UI shells for a wizard and a recommendation preview.
  - Current pages (`/app/wizard`) are “Coming Soon”; UI components (`CommunityWizard`, `RecommendationView`) exist but are not yet calling the API. Auth and workspace basics are integrated.

Code references:

```30:38:backend/src/http/routes/structure.ts
fastify.post(
  '/v1/structure/generate',
  {
    preHandler: [authMiddleware, validateBody(intakeFormSchema)],
  },
  async (request, reply) => {
```

```269:317:backend/src/domains/structure/StructureService.ts
// Create channels
await db.transaction(async (client) => {
  for (const channel of proposal.channels) {
    // Check if channel already exists
    const existing = await client.query(
      'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
      [workspaceId, channel.name]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO channels (workspace_id, name, description, type, is_private)
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, channel.name, channel.description, channel.type, channel.isPrivate]
      );
```

```42:50:backend/src/core/ai/AIService.ts
// Generate with JSON mode
const result = await openaiProvider.generateJSON<StructureProposal>(
  prompt,
  structureSchema,
  {
    temperature: 0.7,
    maxTokens: 2000,
  }
);
```

```1:43:backend/migrations/002_structure_domain.sql
-- Structure Domain (User Story 1)
CREATE TYPE structure_status AS ENUM ('created','proposed','validated','applying','applied','failed');
...
CREATE TABLE blueprints (
  job_id UUID PRIMARY KEY REFERENCES structure_jobs(job_id) ON DELETE CASCADE,
  blueprint JSONB NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

```200:224:hive-platform/lib/api/client.ts
// Structure (User Story 1)
structure: {
  generate: (data: {
    workspaceId: string;
    communitySize: string;
    coreActivities: string[];
    moderationCapacity: string;
    channelBudget: number;
    additionalContext?: string;
  }) =>
    apiRequest<{ job: any; proposal: any }>('/v1/structure/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getJob: (jobId: string) =>
    apiRequest<{ job: any; proposal: any }>(`/v1/structure/jobs/${jobId}`),

  approve: (jobId: string) =>
    apiRequest<{ jobId: string; status: string; channelsCreated: number }>(
      `/v1/structure/proposals/${jobId}/approve`,
      {
        method: 'POST',
      }
    ),
},
```

### User Story 2 — Centralized File Hub

- Backend
  - File lifecycle: `createJob` → `addFile` (content hash for dedup) → `tagFile` (LLM-based tags) → `indexFile` (embeddings to `file_index`) → `search`.
  - Data model: `file_jobs`, `file_sources`, `files`, `file_index (vector(768), terms, facets)` with relevant indexes; status enum `created|harvested|deduplicated|indexed|failed`.
  - AI:
    - `AIService.generateFileTags` validates tags against `fileTagsSchema`.
    - `AIService.generateEmbeddings` produces 768-d vectors (mock or OpenAI embed); stored per file.
  - Search: current endpoint filters by tags, type, channel, and name ILIKE. (The vector index is populated; hybrid/vector search can be extended.)
  - API endpoints:
    - POST `/v1/workspaces/:workspaceId/files/sync` → creates file sync job.
    - POST `/v1/files/:fileId/tag` → AI tags a file.
    - POST `/v1/files/:fileId/index` → generate/store embedding.
    - GET `/v1/files/search` → filtered search over files.
- Frontend
  - API client includes `files.search/tag/index/createSyncJob`.
  - `/app/files` page is “Coming Soon”; a rich `HubDashboard` component exists (mock data, interactions) but is not yet bound to real endpoints.

Code references:

```211:229:backend/src/domains/filehub/FileHubService.ts
// Generate embedding
const text = `${file.name} ${(file.tags || []).join(' ')}`;
const embeddingResult = await aiService.generateEmbeddings([text]);
...
// Store in index
await db.query(
  `INSERT INTO file_index (file_id, embedding, facets)
   VALUES ($1, $2, $3)
   ON CONFLICT (file_id) DO UPDATE
   SET embedding = $2, facets = $3, indexed_at = now()`,
  [fileId, JSON.stringify(embedding), JSON.stringify({ tags: file.tags })]
);
```

```61:71:backend/src/http/routes/filehub.ts
fastify.get(
  '/v1/files/search',
  {
    preHandler: [authMiddleware, validateQuery(searchSchema)],
  },
  async (request, reply) => {
```

```1:13:backend/migrations/003_filehub_domain.sql
-- File Hub Domain (User Story 2)
CREATE TYPE file_job_status AS ENUM ('created','harvested','deduplicated','indexed','failed');

CREATE TABLE file_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status file_job_status NOT NULL DEFAULT 'created',
  stats JSONB,
  created_by UUID REFERENCES users(id),
```

```227:253:hive-platform/lib/api/client.ts
// File Hub (User Story 2)
files: {
  search: (params: { q?: string; tags?: string; mimeType?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.tags) query.set('tags', params.tags);
    if (params.mimeType) query.set('mimeType', params.mimeType);
    if (params.limit) query.set('limit', params.limit.toString());

    return apiRequest<any[]>(`/v1/files/search?${query.toString()}`);
  },

  tag: (fileId: string) =>
    apiRequest<any>(`/v1/files/${fileId}/tag`, {
      method: 'POST',
    }),

  index: (fileId: string) =>
    apiRequest<{ indexed: boolean }>(`/v1/files/${fileId}/index`, {
      method: 'POST',
    }),

  createSyncJob: (workspaceId: string) =>
    apiRequest<any>(`/v1/workspaces/${workspaceId}/files/sync`, {
      method: 'POST',
    }),
},
```

### What’s complete vs pending

- Backend: Both stories are fully implemented with routes, services, migrations, and AI integration (mock/real modes), plus tests and a shared result envelope.
- Frontend: Auth/workspaces are wired; wizard and file hub have polished UIs and typed API client methods, but the pages are placeholders and not yet calling the backend.

- IMPLEMENTATION docs corroborate: both user stories complete and tested in backend; frontend integration for wizard/file hub is noted as pending.

Sources: `backend/src/domains/structure/StructureService.ts`, `backend/src/http/routes/structure.ts`, `backend/src/core/ai/AIService.ts`, `backend/src/core/ai/prompts/*`, `backend/migrations/00{1,2,3,4}_*.sql`, `backend/src/domains/filehub/FileHubService.ts`, `backend/src/http/routes/filehub.ts`, `hive-platform/lib/api/client.ts`, `hive-platform/components/features/wizard/*`, `hive-platform/components/features/file-hub/HubDashboard.tsx`, `IMPLEMENTATION_COMPLETE.md`, `backend/docs/BACKEND_COMPLETE.md`.

- I reviewed the backend services, routes, and migrations for both stories, plus the Next.js API client and UI shells. Both stories are complete on the backend; the frontend exposes typed client calls and polished UIs but hasn’t wired the wizard and hub pages to the API yet.

```typescript
fastify.post(
  '/v1/structure/generate',
  {
    preHandler: [authMiddleware, validateBody(intakeFormSchema)],
  },
  async (request, reply) => {
```

```typescript
// Create channels
await db.transaction(async (client) => {
  for (const channel of proposal.channels) {
    // Check if channel already exists
    const existing = await client.query(
      'SELECT id FROM channels WHERE workspace_id = $1 AND name = $2',
      [workspaceId, channel.name]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO channels (workspace_id, name, description, type, is_private)
         VALUES ($1, $2, $3, $4, $5)`,
        [workspaceId, channel.name, channel.description, channel.type, channel.isPrivate]
      );
```

```typescript
// Generate with JSON mode
const result = await openaiProvider.generateJSON<StructureProposal>(
  prompt,
  structureSchema,
  {
    temperature: 0.7,
    maxTokens: 2000,
  }
);
```

```sql
-- Structure Domain (User Story 1)
CREATE TYPE structure_status AS ENUM ('created','proposed','validated','applying','applied','failed');
...
CREATE TABLE blueprints (
  job_id UUID PRIMARY KEY REFERENCES structure_jobs(job_id) ON DELETE CASCADE,
  blueprint JSONB NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

```typescript
// Structure (User Story 1)
structure: {
  generate: (data: {
    workspaceId: string;
    communitySize: string;
    coreActivities: string[];
    moderationCapacity: string;
    channelBudget: number;
    additionalContext?: string;
  }) =>
    apiRequest<{ job: any; proposal: any }>('/v1/structure/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getJob: (jobId: string) =>
    apiRequest<{ job: any; proposal: any }>(`/v1/structure/jobs/${jobId}`),

  approve: (jobId: string) =>
    apiRequest<{ jobId: string; status: string; channelsCreated: number }>(
      `/v1/structure/proposals/${jobId}/approve`,
      {
        method: 'POST',
      }
    ),
},
```

```typescript
// Generate embedding
const text = `${file.name} ${(file.tags || []).join(' ')}`;
const embeddingResult = await aiService.generateEmbeddings([text]);
...
// Store in index
await db.query(
  `INSERT INTO file_index (file_id, embedding, facets)
   VALUES ($1, $2, $3)
   ON CONFLICT (file_id) DO UPDATE
   SET embedding = $2, facets = $3, indexed_at = now()`,
  [fileId, JSON.stringify(embedding), JSON.stringify({ tags: file.tags })]
);
```

```typescript
fastify.get(
  '/v1/files/search',
  {
    preHandler: [authMiddleware, validateQuery(searchSchema)],
  },
  async (request, reply) => {
```

```sql
-- File Hub Domain (User Story 2)
CREATE TYPE file_job_status AS ENUM ('created','harvested','deduplicated','indexed','failed');

CREATE TABLE file_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status file_job_status NOT NULL DEFAULT 'created',
  stats JSONB,
  created_by UUID REFERENCES users(id),
```

```typescript
// File Hub (User Story 2)
files: {
  search: (params: { q?: string; tags?: string; mimeType?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.tags) query.set('tags', params.tags);
    if (params.mimeType) query.set('mimeType', params.mimeType);
    if (params.limit) query.set('limit', params.limit.toString());

    return apiRequest<any[]>(`/v1/files/search?${query.toString()}`);
  },

  tag: (fileId: string) =>
    apiRequest<any>(`/v1/files/${fileId}/tag`, {
      method: 'POST',
    }),

  index: (fileId: string) =>
    apiRequest<{ indexed: boolean }>(`/v1/files/${fileId}/index`, {
      method: 'POST',
    }),

  createSyncJob: (workspaceId: string) =>
    apiRequest<any>(`/v1/workspaces/${workspaceId}/files/sync`, {
      method: 'POST',
    }),
},
```

---

**User**

Look through the source code of your frontend and identify two code files that contain the most core functionality that implements the two frontend user stories. There must be at least 5 functions in each file.

---

**Cursor**

I scanned the Next.js frontend and picked one file per story that holds the densest, core UI logic for each flow, each with 5+ functions (including named functions and inline callbacks).

### Story 1 (AI-generated structure)
- File: `hive-platform/components/features/wizard/CommunityWizard.tsx`
- Why this file: It encapsulates the intake flow and step management for generating the workspace structure.
- Functions present (5+):
  - `CommunityWizard` (function component)
  - `handleActivityChange`
  - `canContinue`
  - `handleContinue`
  - Multiple inline callbacks driving the UI behavior:
    - Select `onValueChange` for `communitySize`
    - Checkbox `onCheckedChange` for `coreActivities`
    - Select `onValueChange` for `moderationCapacity`
    - Slider `onValueChange` for channel budget
    - Badge `onClick` for provider selection
    - Navigation button `onClick` handlers and Dialog `onOpenChange`

### Story 2 (Centralized file hub)
- File: `hive-platform/components/features/file-hub/HubDashboard.tsx`
- Why this file: It provides the main File Hub UX including sources linking, search/filtering, file grid, dedupe banner, rules, and audits.
- Functions present (5+):
  - `getFileIcon` (top-level)
  - `getStatusIcon` (top-level)
  - `HubDashboard` (function component)
  - `handleLinkSource`
  - `filteredFiles` filter callback
  - Multiple inline callbacks:
    - Search `onChange`
    - `Select` `onValueChange` for source and channel filters
    - Numerous `.map()` render callbacks across sources, files, tags, and activity lists
    - Button `onClick` handlers for UI actions

- Picked the central Next.js components for each story and verified they have 5+ functions each (including inline callbacks).

---

**User**

Look through the source code of your backend and identify two code files that contain the most core functionality that implements the two backend user stories. There must be at least 5 functions in each file.

---

**Cursor**

Here are the two core backend files, one per user story, each with 5+ functions.

### Story 1 - AI generated structure
- File: `backend/src/domains/structure/StructureService.ts`
- Why: Central orchestrator for intake, proposal generation, and applying the blueprint.
- Core functions (5+):
  - `createJob`
  - `generateProposal`
  - `getJob`
  - `getLatestProposal`
  - `applyProposal`
  - `updateJobStatus` (private)
  - `calculateScore` (private)
  - `rowToJob` (private)

### Story 2 - Centralized file hub
- File: `backend/src/domains/filehub/FileHubService.ts`
- Why: Core lifecycle for file ingest, dedupe, tagging, indexing, and search.
- Core functions (5+):
  - `createJob`
  - `addFile`
  - `tagFile`
  - `indexFile`
  - `search`
  - `getJob`
  - `rowToJob` (private)
  - `rowToFile` (private)

- Selected the main service modules for each story and listed 5+ functions in each, covering the essential flows.

---

**User**

Write one English-language test specification for each code file you plan to test. Each specification should contain a list of all functions in the code file, followed by a table of tests. Each row of the table should describe the purpose of the test, the test inputs to the function, and the test output that is expected if the test passes. You must write at least one unit test for every function.

---

**Cursor**

### backend/src/domains/structure/StructureService.ts — Test Specification

- Functions:
  - createJob(workspaceId, userId, intakeForm)
  - generateProposal(jobId)
  - getJob(jobId)
  - getLatestProposal(jobId)
  - applyProposal(jobId, workspaceId)
  - updateJobStatus(jobId, status) [private]
  - calculateScore(proposal, context) [private]
  - rowToJob(row) [private]

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Creates a structure job and stores intake form | workspaceId='ws-1', userId='u-1', intakeForm={communitySize:'25-100', coreActivities:['Projects'], moderationCapacity:'medium', channelBudget:10, additionalContext:'x'}; db.transaction inserts job + intake | Ok with StructureJob { jobId:uuid, workspaceId:'ws-1', status:'created', createdBy:'u-1', createdAt:Date, updatedAt:Date } |
| createJob | Returns Err when DB fails | same inputs; db.transaction throws | Err with Issues.internal('Failed to create job') |
| generateProposal | Generates and persists proposal from AI and moves status to 'proposed' | jobId='j-1'; db returns intake+workspace; aiService.generateStructure returns StructureProposal with channels/committees/rationale; db inserts proposal v1 and updates job status | Ok with ProposalRecord { jobId:'j-1', version:1, score:number∈[0,1], rationale:string, proposal:StructureProposal, createdAt:Date } |
| generateProposal | Returns Err when job/intake not found | jobId='missing'; db returns empty rows | Err with Issues.notFound('Job','missing') and job status unchanged |
| generateProposal | AI failure surfaces Err and sets status 'failed' | jobId='j-2'; aiService.generateStructure returns Err | Err passthrough; side-effect: updateJobStatus('j-2','failed') executed |
| getJob | Retrieves existing job | jobId='j-1'; db returns one row | Ok with StructureJob fields mapped via rowToJob |
| getJob | Returns Err when not found | jobId='missing'; db returns empty | Err with Issues.notFound('Job','missing') |
| getLatestProposal | Retrieves latest version by ORDER BY DESC | jobId='j-1'; db returns v3 row | Ok with ProposalRecord { version:3, ... } |
| getLatestProposal | Returns Err when none exists | jobId='j-no-prop'; db returns empty | Err with Issues.notFound('Proposal for job','j-no-prop') |
| applyProposal | Applies latest proposal: creates channels/committees, saves blueprint, sets status 'applied' | jobId='j-1', workspaceId='ws-1'; db.getLatestProposal returns proposal with 3 channels, 1 committee; channels don’t exist yet | Ok({ created:3 }); side-effects: channels inserted(3), committees inserted(1), blueprint upserted, job status 'applied' |
| applyProposal | Idempotent on existing channels | proposal with 3 channels, two already exist; SELECT finds 2, inserts 1 | Ok({ created:1 }) |
| applyProposal | Returns Err if proposal missing | jobId='j-missing-prop'; getLatestProposal Err | Err passthrough; side-effect: updateJobStatus('j-missing-prop','failed') executed |
| updateJobStatus [private] | Updates status column and timestamp | invoke via (service as any).updateJobStatus('j-1','failed'); db update succeeds | No return (void); side-effect verified by querying job row: status='failed' |
| calculateScore [private] | Scores proposal within budget and with core channels | proposal: channels include general/announcements/random (3), context.channelBudget≥3 | Returns number in (0.5 base + 0.2 + 0.1 + 0.1)=0.9 (capped ≤1.0) |
| calculateScore [private] | Budget penalty path | proposal has channels length > channelBudget | Returns ≤0.7 (base 0.5 + core channel bonuses) |
| rowToJob [private] | Maps DB row → StructureJob | row with snake_case keys | Returns StructureJob with mapped camelCase fields and Date instances |


### backend/src/domains/filehub/FileHubService.ts — Test Specification

- Functions:
  - createJob(workspaceId, userId)
  - addFile(workspaceId, sourceId, fileData)
  - tagFile(fileId)
  - indexFile(fileId)
  - search(workspaceId, query)
  - getJob(jobId)
  - rowToJob(row) [private]
  - rowToFile(row) [private]

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Creates file sync job | workspaceId='ws-1', userId='u-1'; db.insert returns row | Ok with FileJob { jobId:uuid, workspaceId:'ws-1', status:'created', createdBy:'u-1', createdAt, updatedAt } |
| createJob | Returns Err on DB failure | same inputs; db throws | Err with Issues.internal('Failed to create file job') |
| addFile | Inserts file with computed content hash (dedupe path hit) | workspaceId='ws-1', sourceId='s-1', fileData={externalId:'ext-1', name:'Doc.pdf', mimeType:'application/pdf', sizeBytes:100, url:'http://...', content:Buffer<'abc'>, uploadedBy:'u-1'}; db duplicate SELECT finds 1 row; db insert returns row | Ok(FileRecord) with contentHash set, isDuplicate=false (flag not explicitly set), tags=[], indexed=false |
| addFile | Inserts file without content | same but content undefined | Ok(FileRecord) with contentHash null |
| addFile | Returns Err on DB failure | db insert throws | Err with Issues.internal('Failed to add file') |
| tagFile | Tags a file using AI and persists tags | fileId='f-1'; db SELECT returns file row; aiService.generateFileTags returns {tags:['workstreams/app-redesign'], category:'x', confidence:0.9, summary:'...'}; db UPDATE returns updated row | Ok(FileRecord) with tags=['workstreams/app-redesign'] |
| tagFile | Returns Err when file not found | fileId='missing' | Err with Issues.notFound('File','missing') |
| tagFile | Propagates AI Err | aiService.generateFileTags returns Err | Err passthrough |
| indexFile | Generates embedding and upserts into index; marks indexed=true | fileId='f-1'; db SELECT returns file with tags; aiService.generateEmbeddings returns [[...768 dims...]]; db upsert + update succeed | Ok(undefined); side-effects: record in `file_index`, files.indexed=true |
| indexFile | Returns Err when file not found | fileId='missing' | Err with Issues.notFound('File','missing') |
| indexFile | Propagates AI Err | aiService.generateEmbeddings returns Err | Err passthrough |
| search | Returns files filtered by tags/mime/channel/text, limited | workspaceId='ws-1', query={ q:'Design', filters:{ tags:['committees/design'], mimeType:'application/pdf', channelId:'ch-1' }, limit:10 }; db returns 3 rows | Ok(FileRecord[]) length ≤ 10 with matching fields |
| search | Returns empty when no matches | workspaceId='ws-1', query={ q:'zzzz', filters:{}, limit:5 }; db returns [] | Ok([]) |
| search | Returns Err on DB failure | db throws | Err with Issues.internal('Search failed') |
| getJob | Retrieves existing job | jobId='j-1'; db returns row | Ok(FileJob) |
| getJob | Returns Err when not found | jobId='missing' | Err with Issues.notFound('File job','missing') |
| rowToJob [private] | Maps DB row → FileJob | row with snake_case keys | Returns FileJob with mapped fields and Date instances |
| rowToFile [private] | Maps DB row → FileRecord | row with snake_case keys incl tags array | Returns FileRecord with tags defaulting to [] when null |

---

**User**

please do it for both the frontend and the backend files you identified

---

**Cursor**

### Frontend: hive-platform/components/features/wizard/CommunityWizard.tsx — Test Specification

- Functions:
  - CommunityWizard(props)
  - handleActivityChange(activity, checked)
  - canContinue()
  - handleContinue()
  - Inline callbacks within component:
    - Select communitySize onValueChange(value)
    - Checkbox coreActivities onCheckedChange(checked)
    - Select moderationCapacity onValueChange(value)
    - Slider channelBudget onValueChange(value[])
    - Provider Badge onClick(provider)
    - Cancel Button onClick()
    - Back Button onClick()
    - Primary Button onClick() [Continue / Generate Recommendations]
    - Dialog onOpenChange()

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| CommunityWizard | Renders 3-step wizard with progress | Render with onComplete=jest.fn, onCancel=jest.fn | Step 1 visible, progress at 33, buttons present |
| CommunityWizard | Completes flow and calls onComplete with data | Fill size=25-100, activities=Projects, moderation=medium, budget=10, import=false; click Continue twice | onComplete called with {communitySize:'25-100', coreActivities:['Projects'], moderationCapacity:'medium', channelBudget:[10], importWorkspace:false, importProvider:''} |
| handleActivityChange | Adds activity when checked | click activity checkbox to true | coreActivities includes activity |
| handleActivityChange | Removes activity when unchecked | toggle same activity to false | coreActivities excludes activity |
| canContinue | Blocks next when required fields missing | leave defaults; read disabled state of primary button | Primary button disabled on step 1 |
| canContinue | Allows next when required fields set | set size, moderation, at least one activity | Primary button enabled on step 1 |
| handleContinue | Advances steps until final | click Continue with valid inputs | currentStep increments, then triggers onComplete at step 3 |
| communitySize onValueChange | Updates state | change Select to "100-300" | communitySize state is "100-300"; UI reflects selection |
| moderationCapacity onValueChange | Updates state | change Select to "high" | moderationCapacity state is "high" |
| channelBudget onValueChange | Updates state with numeric array | slide to 12 | channelBudget equals [12] and label shows 12 |
| Provider Badge onClick | Sets import provider when import enabled | toggle importWorkspace=true, click "Slack" badge | importProvider equals "Slack" |
| Cancel Button onClick | Calls onCancel | click Cancel | onCancel called once |
| Back Button onClick | Moves to previous step | progress to step 2 then click Back | currentStep decremented to 1 |
| Primary Button onClick | Calls onComplete at final step | reach step 3 and click Generate Recommendations | onComplete called once with latest state |
| Dialog onOpenChange | No-op handler does not throw | trigger onOpenChange | No errors; component remains mounted |


### Frontend: hive-platform/components/features/file-hub/HubDashboard.tsx — Test Specification

- Functions:
  - getFileIcon(type)
  - getStatusIcon(status)
  - HubDashboard(props)
  - handleLinkSource(sourceId)
  - Inline callbacks within component:
    - Search Input onChange(e)
    - Select source onValueChange(value)
    - Select channel onValueChange(value)
    - Files grid card onClick(file)
    - Close drawer Button onClick()
    - Back to Chat Button onClick()
    - Rules switches onCheckedChange(value) [hash-dedupe, similarity disabled]
    - View rules Button onClick()
    - Map render callbacks for sources, files, tags, activities

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| getFileIcon | Returns correct icon for pdf | type='pdf' | JSX with FileText and class 'text-destructive' |
| getFileIcon | Returns default icon for unknown | type='unknown' | JSX with File |
| getStatusIcon | Shows linked status icon | status='linked' | JSX with CheckCircle and class 'text-chart-2' |
| getStatusIcon | Shows reauth icon | status='reauth' | JSX with AlertCircle |
| HubDashboard | Renders tabs and default view | Render with onBack=jest.fn | Tabs visible, 'overview' selected |
| handleLinkSource | Triggers linking flow toast | Click Link on an unlinked source | toast.success called with "Linking..." then scheduled success (use fake timers) |
| Search Input onChange | Filters by title substring | type "design" | Files grid shows only files with "design" in title |
| Select source onValueChange | Filters by source | choose "Google Drive" | Files grid shows only Google Drive items |
| Select channel onValueChange | Filters by channel tag | choose "committees" | Files grid shows items with tags including "committees" |
| Files grid card onClick | Opens detail drawer | click first visible file card | Drawer opens with file details and actions |
| Close drawer Button onClick | Closes drawer | click × in drawer | Drawer unmounted |
| Back to Chat Button onClick | Calls onBack | click Back to Chat | onBack called once |
| Rules switches onCheckedChange | Toggles dedupe flag; similarity disabled | toggle hash-dedupe; attempt toggle similarity | dedupeEnabled flips; similarity remains disabled and unchanged |
| View rules Button onClick | No-op UI action does not error | click View rules | No error; can assert function invoked if wired or absence of state change |
| Map render callbacks | Renders lists correctly | initial render | Sources list count equals mock array length; files grid shows expected count |


### Backend: backend/src/domains/structure/StructureService.ts — Test Specification

- Functions:
  - createJob(workspaceId, userId, intakeForm)
  - generateProposal(jobId)
  - getJob(jobId)
  - getLatestProposal(jobId)
  - applyProposal(jobId, workspaceId)
  - updateJobStatus(jobId, status) [private]
  - calculateScore(proposal, context) [private]
  - rowToJob(row) [private]

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Creates a structure job and stores intake | workspaceId='ws-1', userId='u-1', intake={size:'25-100', activities:['Projects'], moderation:'medium', budget:10, ctx:'x'} | Ok with StructureJob {workspaceId:'ws-1', status:'created', createdBy:'u-1'}; DB has intake row |
| createJob | Returns Err on DB failure | same; db.transaction throws | Err with Issues.internal('Failed to create job') |
| generateProposal | Generates and persists proposal; status 'proposed' | jobId='j-1'; db returns intake+workspace; ai ok | Ok ProposalRecord {jobId:'j-1', version:1, score∈[0,1]} and job status updated |
| generateProposal | Err when job not found | jobId='missing' | Err Issues.notFound('Job','missing') |
| generateProposal | AI failure sets job failed | jobId='j-2'; ai returns Err | Err passthrough; structure_jobs.status='failed' |
| getJob | Retrieves job | jobId='j-1' | Ok StructureJob |
| getJob | Err when not found | jobId='missing' | Err Issues.notFound('Job','missing') |
| getLatestProposal | Returns latest by version desc | jobId='j-1' with versions 1..3 | Ok ProposalRecord.version===3 |
| getLatestProposal | Err when none | jobId='j-none' | Err Issues.notFound('Proposal for job','j-none') |
| applyProposal | Creates channels/committees, saves blueprint, status 'applied' | jobId='j-1', workspaceId='ws-1'; latest proposal has 3 channels, 1 committee, none exist | Ok({created:3}); blueprint upserted; status='applied' |
| applyProposal | Idempotent on existing channels | two channels preexist | Ok({created:1}) |
| applyProposal | Err when proposal missing | jobId='j-miss', workspaceId='ws-1' | Err passthrough; structure_jobs.status='failed' |
| updateJobStatus [private] | Updates status | call via (service as any).updateJobStatus('j-1','failed') | Query shows status='failed' |
| calculateScore [private] | Scores within budget and with core channels | proposal with ['general','announcements'] and within budget | Score increases from base; numeric in [0.7,1.0] |
| calculateScore [private] | Penalized when over budget | proposal channels > budget | Score ≤ 0.7 |
| rowToJob [private] | Maps DB row to domain | snake_case row | StructureJob with camelCase and Date types |


### Backend: backend/src/domains/filehub/FileHubService.ts — Test Specification

- Functions:
  - createJob(workspaceId, userId)
  - addFile(workspaceId, sourceId, fileData)
  - tagFile(fileId)
  - indexFile(fileId)
  - search(workspaceId, query)
  - getJob(jobId)
  - rowToJob(row) [private]
  - rowToFile(row) [private]

| Function | Purpose | Test Inputs | Expected Output |
|---|---|---|---|
| createJob | Creates file sync job | workspaceId='ws-1', userId='u-1' | Ok FileJob {workspaceId:'ws-1', status:'created', createdBy:'u-1'} |
| createJob | Returns Err on DB failure | same; db throws | Err Issues.internal('Failed to create file job') |
| addFile | Inserts file with computed hash | content=Buffer('abc'), name:'Doc.pdf', externalId:'ext-1' | Ok FileRecord with contentHash set, tags=[], indexed=false |
| addFile | Detects duplicate (non-blocking) | preinsert file with same hash; add same content | Ok FileRecord; log duplicate; insert still occurs |
| addFile | Inserts without content | content undefined | Ok FileRecord with contentHash null |
| addFile | Returns Err on DB failure | db insert throws | Err Issues.internal('Failed to add file') |
| tagFile | AI tags persisted on file | fileId='f-1'; ai returns tags ['workstreams/app-redesign'] | Ok FileRecord.tags updated; log includes confidence |
| tagFile | Err when file not found | fileId='missing' | Err Issues.notFound('File','missing') |
| tagFile | Propagates AI Err | ai returns Err | Err passthrough |
| indexFile | Embeds and upserts vector; marks indexed | fileId='f-1'; ai returns 768-d vector | Ok(undefined); file_index upserted; files.indexed=true |
| indexFile | Err when file not found | fileId='missing' | Err Issues.notFound('File','missing') |
| indexFile | Propagates AI Err | ai returns Err | Err passthrough |
| search | Applies filters and limit | query={q:'Design', filters:{tags:['committees/design'], mimeType:'application/pdf', channelId:'ch-1'}, limit:10} | Ok FileRecord[] length ≤ 10 matching filters |
| search | Returns empty when no matches | filters produce none | Ok([]) |
| search | Returns Err on DB failure | db throws | Err Issues.internal('Search failed') |
| getJob | Retrieves job | jobId='j-1' | Ok FileJob |
| getJob | Err when not found | jobId='missing' | Err Issues.notFound('File job','missing') |
| rowToJob [private] | Maps DB row | snake_case row | FileJob with camelCase, Date types |
| rowToFile [private] | Maps DB row with tags | snake_case row, tags null | FileRecord.tags defaults to [] |

- Created test specs for 4 files (2 frontend, 2 backend), listed functions per file, and provided at least one test per function with inputs and expected outcomes.

