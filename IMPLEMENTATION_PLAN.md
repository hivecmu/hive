# Hive Implementation Plan: Making AI Features Functional

## Executive Summary

The AI Structure Wizard and Hub Dashboard currently have significant portions that are **mocked or hardcoded**. While backend database operations are functional, the AI integration is disabled by default and the frontend displays hardcoded data instead of API responses.

---

## User Story 1: AI Structure Wizard

### Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Backend DB Operations | **REAL** | Jobs, proposals, channels saved to PostgreSQL |
| Backend AI Generation | **MOCKED** | Returns 3 hardcoded channels unless `USE_REAL_AI=true` |
| Frontend Intake Form | **REAL** | Sends data to backend correctly |
| Frontend Recommendation View | **HARDCODED** | Displays static data, ignores API response |
| Frontend ChangeSet Preview | **HARDCODED** | Displays static diff, ignores API response |

### Detailed Findings

#### Backend - What Works
- `StructureService.ts:65-109` - Creates jobs and saves intake forms to database
- `StructureService.ts:256-351` - Applies proposals and creates actual channels
- Database tables: `structure_jobs`, `intake_forms`, `proposals`, `blueprints`, `channels`

#### Backend - What's Mocked
**File: `backend/src/core/ai/AIService.ts:29-31`**
```typescript
if (!config.useRealAI) {
  logger.info('Using mock AI (USE_REAL_AI=false)');
  return this.mockStructureGeneration(context);
}
```

**Mock returns only 3 channels (lines 181-211):**
```typescript
private mockStructureGeneration(_context: StructureContext): Result<StructureProposal, any> {
  const proposal: StructureProposal = {
    channels: [
      { name: 'general', description: 'General discussion', type: 'core', isPrivate: false },
      { name: 'announcements', description: 'Important announcements', type: 'core', isPrivate: false },
      { name: 'random', description: 'Off-topic conversations', type: 'core', isPrivate: false },
    ],
    committees: [],
    rationale: 'Mock structure for testing',
    estimatedComplexity: 'simple',
  };
  return Ok(proposal);
}
```

#### Frontend - What's Hardcoded

**File: `hive-platform/components/features/wizard/RecommendationView.tsx:24-53`**
The component receives `data` prop with summary counts but displays these hardcoded arrays:
```typescript
const coreChannels = [
  { name: "announcements", description: "write: officers", icon: <Shield /> },
  { name: "general", description: "all", icon: <Hash /> },
  { name: "random", description: "all", icon: <Hash /> },
  { name: "help-desk", description: "officers triage", icon: <Hash /> }
];

const workstreams = [
  { name: "workstreams/app-redesign", description: "Mobile app redesign project" },
  { name: "workstreams/website", description: "Company website overhaul" },
  { name: "workstreams/outreach", description: "Community outreach initiatives" }
];

const subgroups = [
  { name: "Design Committee", members: 12, channels: ["committees/design", "design-critique"] },
  { name: "Development Committee", members: 15, channels: ["committees/development", "dev-standup"] },
  { name: "Marketing Committee", members: 9, channels: ["committees/marketing"] }
];
```

**File: `hive-platform/components/features/wizard/ChangeSetPreview.tsx:13-49`**
Entirely hardcoded changes array:
```typescript
const changes = [
  { type: "create", count: 5, items: [...] },
  { type: "rename", count: 1, items: [...] },
  { type: "archive", count: 2, items: [...] },
  { type: "move", count: 3, items: [...] }
];
```

### Implementation Tasks

#### Priority 1: Enable Real AI Generation

1. **Set up OpenAI API Key**
   - Add `OPENAI_API_KEY` to `.env`
   - Set `USE_REAL_AI=true` in `.env`
   - File: `backend/.env`

2. **Verify OpenAI Provider**
   - File: `backend/src/core/ai/providers/OpenAIProvider.ts`
   - Ensure it properly handles API calls
   - Test with real API key

#### Priority 2: Connect Frontend to Real Data

3. **Update RecommendationView to use API data**
   - File: `hive-platform/components/features/wizard/RecommendationView.tsx`
   - Change props interface to include full proposal data:
     ```typescript
     interface RecommendationViewProps {
       data: {
         proposal: StructureProposal; // Add this
         channels: number;
         subgroups: number;
         // ...
       };
     }
     ```
   - Replace hardcoded arrays with `data.proposal.channels`, etc.
   - Group channels by type (core, workstream, committee)

4. **Update ChangeSetPreview to compute real diff**
   - File: `hive-platform/components/features/wizard/ChangeSetPreview.tsx`
   - Fetch existing channels from workspace
   - Compare with proposed channels to compute actual diff
   - Show real create/rename/archive/move operations

5. **Update StructureWizard to pass proposal data**
   - File: `hive-platform/components/features/wizard/StructureWizard.tsx`
   - Store full proposal response from API
   - Pass proposal to RecommendationView and ChangeSetPreview

#### Priority 3: Improve AI Prompts

6. **Enhance structure-generation prompt**
   - File: `backend/src/core/ai/prompts/structure-generation.ts`
   - Add more context about:
     - Existing channels in workspace
     - Industry best practices
     - Channel naming conventions
   - Request more detailed rationale per channel

---

## User Story 2: Hub Dashboard

### Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Backend File Storage | **REAL** | Files stored in PostgreSQL with S3 references |
| Backend Search | **REAL** | SQL-based search works |
| Backend AI Tagging | **MOCKED** | Returns generic tags unless `USE_REAL_AI=true` |
| Backend Embeddings | **MOCKED** | Returns random vectors unless `USE_REAL_AI=true` |
| Frontend File List | **REAL** | Fetches from API, but no files exist |
| Frontend Upload | **NOT IMPLEMENTED** | Shows "coming soon" toast |
| Frontend Sources Tab | **PARTIAL** | Google Drive/Dropbox disabled |
| Frontend Insights Tab | **REAL** | Shows stats from actual file data |

### Detailed Findings

#### Backend - What Works
- `FileHubService.ts:88-147` - Adds files to database with deduplication
- `FileHubService.ts:250-302` - Search functionality with filters
- Database tables: `files`, `file_jobs`, `file_index`

#### Backend - What's Mocked

**File: `backend/src/core/ai/AIService.ts:91-94` (File Tagging)**
```typescript
if (!config.useRealAI) {
  logger.info('Using mock AI (USE_REAL_AI=false)');
  return this.mockFileTagging(context);
}
```

**Mock tags (lines 216-225):**
```typescript
private mockFileTagging(context: FileContext): Result<FileTagsProposal, any> {
  const proposal: FileTagsProposal = {
    tags: ['document', 'general', 'mock'],
    category: 'general',
    confidence: 0.5,
    summary: `Mock tags for ${context.fileName}`,
  };
  return Ok(proposal);
}
```

**File: `backend/src/core/ai/AIService.ts:151-154` (Embeddings)**
```typescript
if (!config.useRealAI) {
  logger.info('Using mock AI for embeddings (USE_REAL_AI=false)');
  return this.mockEmbeddings(texts);
}
```

**Mock embeddings return random 768-dimensional vectors (lines 230-237):**
```typescript
private mockEmbeddings(texts: string[]): Result<number[][], any> {
  const embeddings = texts.map(() => {
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  });
  return Ok(embeddings);
}
```

#### Frontend - What's Missing

**File: `hive-platform/components/features/file-hub/HubDashboard.tsx:176-179`**
```typescript
const handleFileUpload = () => {
  // TODO: Implement file upload
  toast.info('File upload coming soon');
};
```

### Implementation Tasks

#### Priority 1: Enable File Upload

1. **Complete file upload in Hub Dashboard**
   - File: `hive-platform/components/features/file-hub/HubDashboard.tsx`
   - Add file input and upload handler similar to `MessageInput.tsx`
   - Use existing upload endpoint: `POST /v1/upload/message`
   - After upload, call `FileHubService.addFile()` to register in Hub

2. **Create dedicated Hub upload endpoint**
   - File: `backend/src/http/routes/filehub.ts`
   - Add `POST /v1/workspaces/:workspaceId/files/upload`
   - Accept file via multipart form
   - Upload to S3 and register in database

#### Priority 2: Enable Real AI Features

3. **Enable real AI for file tagging**
   - Set `USE_REAL_AI=true` in `.env`
   - Verify OpenAI API key is set
   - Test with real file uploads

4. **Enable semantic search with real embeddings**
   - Embeddings currently stored as JSON in `file_index` table
   - Consider using pgvector extension for efficient similarity search
   - File: `backend/src/domains/filehub/FileHubService.ts:250-302`

#### Priority 3: External Integrations

5. **Google Drive Integration**
   - Create OAuth flow for Google Drive
   - Add `POST /v1/sources/google-drive/connect`
   - Implement file sync from Drive to Hub

6. **Dropbox Integration**
   - Create OAuth flow for Dropbox
   - Add `POST /v1/sources/dropbox/connect`
   - Implement file sync from Dropbox to Hub

#### Priority 4: Advanced Features

7. **Automatic file sync from chat messages**
   - When files are uploaded to chat, auto-add to Hub
   - File: `backend/src/http/routes/upload.ts`
   - Call `fileHubService.addFile()` after message upload

8. **Deduplication UI**
   - Show duplicate files in Hub
   - Allow user to merge or delete duplicates
   - File: `hive-platform/components/features/file-hub/HubDashboard.tsx`

---

## Environment Setup Required

### Backend `.env` additions:
```env
# Enable real AI (default is false)
USE_REAL_AI=true

# OpenAI API Key (required when USE_REAL_AI=true)
OPENAI_API_KEY=sk-...

# Optional: OpenAI Organization
OPENAI_ORG_ID=org-...
```

### Database Migrations Needed

1. **pgvector extension for semantic search**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;

   ALTER TABLE file_index
   ALTER COLUMN embedding TYPE vector(768)
   USING embedding::vector(768);

   CREATE INDEX file_embedding_idx ON file_index
   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

---

## Testing Checklist

### AI Structure Wizard
- [ ] Fill out intake form with various inputs
- [ ] Verify AI generates unique channels based on input
- [ ] Verify RecommendationView shows AI-generated channels (not hardcoded)
- [ ] Verify ChangeSetPreview shows real diff against existing channels
- [ ] Verify approved channels are created in database
- [ ] Verify channels appear in sidebar after approval

### Hub Dashboard
- [ ] Upload file via Hub Dashboard
- [ ] Verify file appears in file list
- [ ] Verify file metadata (size, date) displays correctly
- [ ] Click "Tag" and verify AI generates relevant tags
- [ ] Click "Index" and verify file is indexed
- [ ] Search for file by name
- [ ] Search for file by tag
- [ ] Filter files by type

---

## Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Enable OpenAI integration | 1 hour | P1 |
| Update RecommendationView to use real data | 4 hours | P1 |
| Update ChangeSetPreview to compute real diff | 4 hours | P1 |
| Implement Hub file upload | 2 hours | P1 |
| Add semantic search with pgvector | 4 hours | P2 |
| Google Drive integration | 8 hours | P3 |
| Dropbox integration | 8 hours | P3 |
| Auto-sync chat files to Hub | 2 hours | P2 |

**Total: ~33 hours of development work**

---

## Files to Modify

### Backend
- `backend/.env` - Add API keys and enable real AI
- `backend/src/core/ai/AIService.ts` - No changes needed (works when enabled)
- `backend/src/http/routes/filehub.ts` - Add upload endpoint
- `backend/migrations/XXX_pgvector.sql` - Add vector extension

### Frontend
- `hive-platform/components/features/wizard/RecommendationView.tsx` - Use API data
- `hive-platform/components/features/wizard/ChangeSetPreview.tsx` - Compute real diff
- `hive-platform/components/features/wizard/StructureWizard.tsx` - Pass proposal data
- `hive-platform/components/features/file-hub/HubDashboard.tsx` - Implement upload
