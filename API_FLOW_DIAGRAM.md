# AI Structure Wizard - API Flow Diagram

## Complete Request/Response Flow

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. User completes wizard form
       │    { communitySize, coreActivities, moderationCapacity, channelBudget }
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ handleWizardComplete() in /app/app/page.tsx             │
└──────┬───────────────────────────────────────────────────┘
       │
       │ POST /v1/structure/generate
       │ {
       │   workspaceId: string,
       │   communitySize: string,
       │   coreActivities: string[],
       │   moderationCapacity: string,
       │   channelBudget: number,
       │   additionalContext?: string
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Backend: POST /v1/structure/generate                    │
│ File: /backend/src/http/routes/structure.ts             │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 1. Validate request body
       │ 2. Check user is workspace member
       │ 3. Create structure job
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ structureService.createJob()                            │
│ File: /backend/src/domains/structure/StructureService.ts│
└──────┬───────────────────────────────────────────────────┘
       │
       │ INSERT INTO structure_jobs
       │ INSERT INTO intake_forms
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ structureService.generateProposal()                     │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Build context from intake form
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ aiService.generateStructure()                           │
│ File: /backend/src/core/ai/AIService.ts                 │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Call OpenAI with structured prompt
       │ Parse JSON response
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ OpenAI API                                              │
│ Returns StructureProposal:                              │
│ {                                                       │
│   channels: [{name, description, type, isPrivate}],    │
│   committees: [{name, description, purpose}],          │
│   rationale: string                                     │
│ }                                                       │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Save proposal to database
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Database Operations:                                    │
│ INSERT INTO proposals (job_id, version, proposal, ...)  │
│ UPDATE structure_jobs SET status = 'proposed'           │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Response: 201 Created
       │ {
       │   ok: true,
       │   value: {
       │     job: { jobId, workspaceId, status, ... },
       │     proposal: {
       │       jobId, version, score, rationale,
       │       proposal: { channels, committees, ... }
       │     }
       │   }
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Frontend: Store jobId and show RecommendationView       │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 2. User reviews and clicks "Approve Changes"
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ handleFinalApproval() in /app/app/page.tsx             │
└──────┬───────────────────────────────────────────────────┘
       │
       │ POST /v1/structure/proposals/:jobId/approve
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Backend: POST /v1/structure/proposals/:jobId/approve   │
│ File: /backend/src/http/routes/structure.ts            │
└──────┬───────────────────────────────────────────────────┘
       │
       │ 1. Get job by ID
       │ 2. Verify user is admin
       │ 3. Apply proposal
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ structureService.applyProposal(jobId, workspaceId,     │
│                                 userId)                 │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Get latest proposal from database
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Database Transaction:                                   │
│                                                          │
│ FOR EACH channel in proposal.channels:                  │
│   IF NOT EXISTS (workspace_id, name):                   │
│     INSERT INTO channels (                              │
│       workspace_id, name, description,                  │
│       type, is_private, created_by                      │
│     )                                                    │
│                                                          │
│ FOR EACH committee in proposal.committees:              │
│   IF NOT EXISTS (workspace_id, name):                   │
│     INSERT INTO committees (                            │
│       workspace_id, name, description                   │
│     )                                                    │
│                                                          │
│ INSERT INTO blueprints (job_id, blueprint, applied_at)  │
│ UPDATE structure_jobs SET status = 'applied'            │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Response: 200 OK
       │ {
       │   ok: true,
       │   value: {
       │     jobId: string,
       │     status: 'applied',
       │     channelsCreated: number
       │   }
       │ }
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│ Frontend: Show success toast and redirect to chat      │
│ Channels now visible in sidebar                        │
└──────────────────────────────────────────────────────────┘
```

## Database Tables Used

### structure_jobs
- Tracks each structure generation request
- Status: created → proposed → applying → applied

### intake_forms
- Stores user input from wizard
- Linked to structure_jobs via job_id

### proposals
- Stores AI-generated proposals
- Versioned (can regenerate)
- Includes score and rationale

### blueprints
- Stores the final applied blueprint
- One per job (upserted on approval)

### channels
- The actual channels created
- Linked to workspace
- All workspace members have access

### committees
- Optional subgroups
- Linked to workspace

## Key Design Decisions

1. **Job-based workflow**: Create job first, then generate proposal, then apply
   - Enables tracking and auditing
   - Allows regeneration without losing history
   - Supports async processing if needed

2. **Workspace-scoped channels**: No separate channel membership table
   - All workspace members can access all channels (unless private)
   - Simpler model, fewer joins
   - Membership controlled at workspace level

3. **Transaction safety**: All channel creation in single transaction
   - Either all channels created or none
   - Prevents partial failures
   - Status updated atomically

4. **Idempotency**: Check for existing channels before creating
   - Safe to retry approval
   - Won't duplicate channels
   - Graceful handling of existing data

5. **User attribution**: Track who created each channel
   - Audit trail
   - Accountability
   - Future permission model support

## Error Handling

### Frontend
- Network errors → Show "Failed to connect" toast
- API errors → Show specific error message from backend
- Loading states → Show progress toasts
- Validation → Disable buttons until ready

### Backend
- Validation errors → 400 with specific field errors
- Not found → 404 with entity type and ID
- Permission denied → 403 with clear message
- Internal errors → 500 with generic message (details logged)
- Transaction failures → Automatic rollback

## Security Checks

1. **Authentication**: All endpoints require valid JWT token
2. **Workspace membership**: Verify user is member before generating
3. **Admin permission**: Only admins can approve proposals
4. **Input validation**: Zod schemas validate all inputs
5. **SQL injection**: Parameterized queries throughout

## Performance Considerations

1. **AI latency**: Structure generation can take 2-5 seconds
   - Show loading indicator
   - Could be moved to background job for larger workspaces

2. **Channel creation**: Loop-based insert could be slow for 20+ channels
   - Currently acceptable for budget ≤20
   - Could batch with UNNEST for larger proposals

3. **Database queries**: Efficient indexes on:
   - workspace_members(workspace_id, user_id)
   - channels(workspace_id, name)
   - structure_jobs(job_id)

4. **Transaction size**: Keep transactions short
   - Only channel/committee creation in transaction
   - Proposal generation happens before transaction
