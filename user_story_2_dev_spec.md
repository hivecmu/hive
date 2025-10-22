# User Story 2 Dev Spec


## Title: Centralized AI-Linked Project File Hub (User Story #2)

Authors: Akeil Smith, Lexi Kronowitz, Miguel Almeida

Version/Date: v1.0 — 2025-10-21

User Story:
As a project manager, I want Slack to design a centralized project file hub that integrates with the created structure, using channel and subgroup data to consolidate, deduplicate, tag, and make all project files searchable so that my team can easily find and manage files across the workspace.

Outcome:
A Slack-integrated file hub that auto-aggregates all shared files (messages, threads, Drive/SharePoint attachments, and pinned content) from the newly generated workspace structure, deduplicates them, applies smart tagging, and provides unified search and preview capabilities via Slack Home Tab or Modals.
Primary KPIs:
Average file retrieval time (<5 sec), file duplication reduction (≥40%), search precision@5 (≥0.8), PM satisfaction (CSAT ≥4.5/5).

## Architecture Diagram

![ alt text](u2_arch.png)

flowchart LR
 subgraph slack_client ["Slack Client (User Workspace)"]
   H[Home Tab]
   FH[File Hub View]
   M[Config Modal]
   SC[/Slash Commands/]
   SHT[(Shortcuts)]
 end

 subgraph backend ["Backend (Cloud)"]
   API[Events & Interactions API]
   ORC[Orchestrator Service]
   AI["AI Engine\n(Tagging + Dedup + Relevance Model)"]
   IDX[(Vector + Full-Text Index)]
   DB[(PostgreSQL)]
   Q[(Queue)]
   REDIS[(Redis Cache)]
   S3[(File Metadata Store)]
   OBS[(Telemetry/Logs)]
 end

 subgraph integrations ["3rd-Party Integrations"]
   SLAPI["Slack Web API + Files API"]
   DRV["Google Drive/SharePoint Connectors"]
   LLM[(Model Provider)]
   DLP[(PII Redaction)]
 end

 SC --> API
 SHT --> API
 FH <--> API
 M <--> API

 API --> ORC
 ORC -->|index job| Q
 ORC -->|sync| DRV
 ORC -->|fetch| SLAPI
 ORC --> AI
 AI -->|tags & embeddings| IDX
 ORC --> DB
 ORC <--> REDIS
 ORC --> S3
 ORC --> OBS
 ORC --> DLP

Explanation:
User interactions (Home Tab, File Hub View, slash commands, modals) trigger the Events API. The Orchestrator synchronizes workspace metadata and file references (from Slack and external drives). Files are deduplicated, classified, and embedded via the AI Engine. Metadata and embeddings persist in PostgreSQL and the vector index for fast semantic search. Redis accelerates session caching; S3 stores previews and extracted text. The DLP stage sanitizes sensitive content. Users can view or search from the File Hub in Slack.

2b. Information Flows
Sync Trigger → Harvest Files → Deduplicate → Tag/Embed → Index → Search UI → Audit/Feedback.
Each phase persists incremental metadata and telemetry events.

## Class Diagram

![ alt text](u2_class.png)

classDiagram
  class FileSyncJob {
    +UUID id
    +String workspaceId
    +JobStatus status
    +String initiatedByUserId
    +Instant createdAt
    +Instant updatedAt
    +start()
    +advance(to: JobStatus)
    +fail(reason: String)
  }

  class FileRecord {
    +UUID id
    +String externalId
    +String source
    +String name
    +String mimeType
    +String url
    +String channelId
    +String[] tags
    +String hash
    +boolean isDuplicate
  }

  class FileEmbedding {
    +UUID id
    +UUID fileId
    +float[] vector
    +String modelVersion
  }

  class FileTagger {
    +generateTags(fileText): String[]
    +deduplicate(files[]): FileRecord[]
    +embed(fileText): float[]
  }

  class FileHubContext {
    +Channel[] channels
    +UserGroup[] groups
    +Map~String,Any~ metadata
  }

  class Orchestrator {
    +startSync(workspaceId): FileSyncJob
    +harvestFiles(jobId)
    +runDedup(jobId)
    +tagAndIndex(jobId)
    +renderFileHub(workspaceId)
  }

  class SearchService {
    +search(query:String, filters:Map): FileRecord[]
    +semanticSearch(query:String): FileRecord[]
    +suggestTags(fileId:UUID): String[]
  }

  class SlackClient {
    +listFiles(channelId)
    +getFileInfo(fileId)
    +postMessage(channelId, blocks)
    +openView(userId, view)
  }

  FileSyncJob --> FileRecord
  FileRecord --> FileEmbedding
  Orchestrator --> FileTagger
  Orchestrator --> SearchService
  Orchestrator --> SlackClient

Explanation:
FileSyncJob governs the sync lifecycle. FileRecord stores normalized metadata from Slack and integrations. FileTagger handles AI-powered deduplication and tagging. FileEmbedding supports vector search. Orchestratormanages sequencing. SearchService exposes text + semantic queries.

## List of Classes (Purpose & Responsibilities)

FileSyncJob — Controls lifecycle and status transitions of file synchronization/indexing jobs.
FileRecord — Represents one logical file with deduplication hash, tags, and Slack linkage.
FileEmbedding — Holds vector embeddings for semantic retrieval.
FileTagger — AI layer for tagging, summarization, and deduplication.
FileHubContext — Snapshot of structural context (channels, groups) used to group results and tags.
Orchestrator — Manages full sync pipeline, persists states, and handles Slack UI updates.
SearchService — Performs keyword and vector searches, applies filters, and computes relevance scores.
SlackClient — Adapter for Slack’s Files and Conversations APIs.

## State Diagram

![ alt text](u2_state.png)

stateDiagram-v2
  [*] --> created
  created --> syncing
  syncing --> processing
  processing --> indexing
  indexing --> available
  available --> refreshing
  created --> failed
  syncing --> failed
  processing --> failed
  indexing --> failed
  refreshing --> failed

Explanation:
Jobs begin at created, transition to syncing while files are fetched, processing for dedup/tagging, indexing for vector insertion, then available once the File Hub is ready. Any step can fail, triggering retries.

## Development Risks and Failures (Explained)

File volume and rate limits — Slack file listing is rate-limited. Mitigation: pagination, caching, and incremental sync.
Duplicate detection complexity — Similar files with slight edits may bypass hash check. Mitigation: fuzzy hash + LLM summary comparison.
Cross-platform integration variance — Google Drive/SharePoint metadata models differ. Mitigation:standardized schema and source adapters.
LLM latency and cost — Embedding and tagging may be slow. Mitigation: batch requests, async queue processing.
PII exposure in tags — File text could contain names/emails. Mitigation: redaction layer and opt-out configuration.
Search precision drift — Over-tagging reduces relevance. Mitigation: relevance feedback loop via user rating.

## Technology Stack
TypeScript (Node.js 20); Bolt for Slack + Fastify; AWS (Lambda/API Gateway, SQS, OpenSearch/pgvector); PostgreSQL; Redis; S3; OpenTelemetry; Jest, Pact, Playwright; Terraform; LLM provider (GPT-4-class, JSON mode).

## APIs
Incoming Slack

POST /slack/events — Handles slash commands, File Hub events.

POST /slack/interactions — Processes modals, search actions, tag edits.

Internal REST

POST /files/sync — Starts file sync job.

GET /files/jobs/{id} — Returns job status + summary stats.

GET /files/search?q= — Returns top file hits.

POST /files/{id}/feedback — Accepts user relevance feedback.

Service Interfaces (Methods)
Orchestrator: startSync, harvestFiles, runDedup, tagAndIndex, renderFileHub, refreshIndex.
FileTagger: generateTags, deduplicate, embed, extractText.
SearchService: search, semanticSearch, suggestTags.
SlackClient: listFiles, getFileInfo, postMessage, openView.

##Public Interfaces (Methods & Contracts)
Slash Command: /filehub
Request: {team_id, user_id, text}
Behavior: Opens File Hub modal or initiates resync.
Home Tab:
“My Files”, “Recently Updated”, “By Channel”, and “Search” sections.
Interactive blocks for quick preview and tagging.
Modals:
File Detail Modal: metadata, AI-suggested tags, preview.
Tag Edit Modal: allows adding/removing tags with autosuggestions.
Search Modal: semantic + keyword search, filters by source/channel/date.



## Data Schemas (Datatypes Included)

![ alt text](u2_data.png)

erDiagram
    workspaces {
        UUID id PK
        TEXT slack_team_id UK
        TEXT installer_user_id
        TIMESTAMPTZ created_at
    }

    file_sync_jobs {
        UUID id PK
        UUID workspace_id FK
        TEXT status
        TEXT initiated_by_user_id
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    file_records {
        UUID id PK
        UUID workspace_id FK
        TEXT external_id
        TEXT source
        TEXT name
        TEXT mime_type
        TEXT url
        TEXT channel_id
        TEXT[] tags
        TEXT hash
        BOOLEAN is_duplicate DEFAULT false
        TIMESTAMPTZ created_at
    }

    file_embeddings {
        UUID id PK
        UUID file_id FK
        VECTOR vector
        TEXT model_version
    }

    file_feedback {
        UUID id PK
        UUID file_id FK
        INT rating
        TEXT comments
        TIMESTAMPTZ created_at
    }

    workspaces ||--o{ file_sync_jobs : "workspace_id"
    workspaces ||--o{ file_records : "workspace_id"
    file_records ||--o{ file_embeddings : "file_id"
    file_records ||--o{ file_feedback : "file_id"


## Security and Privacy (Explained)
Scoped permissions: Request files:read, files:write, chat:write, commands, usergroups:read.
Data minimization: Store only metadata + hashes, not full file bodies.
Encryption: TLS in transit, KMS-encrypted storage.
Access controls: Workspace-scoped tokens; admin-only file deletion.
Retention: Default 30 days for file metadata; configurable per workspace.
DLP/Redaction: Sensitive terms and PII masked before indexing or embedding.
Audit: Every sync and search request logged with userId, timestamp, and filters.

## Risks to Completion (Explained)
Slack API changes or deprecations — may break sync. Plan: monitor API changelog and add abstraction layer.
External storage authorization friction — OAuth scopes for Drive/SharePoint can stall users. Plan: progressive consent model.
Embedding scale cost — Large workspaces may incur high vector DB costs. Plan: lazy embed (on first access).
Model drift — Tagging quality may degrade. Plan: monthly re-training with user feedback data.
User confusion on hub purpose — Must differentiate from Slack search. Plan: onboarding tutorial and tooltips inside File Hub.