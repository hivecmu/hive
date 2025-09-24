# Dev Spec — SA1: Project Hub Auto-Organizer (Consistency-Checked)

## 0) Header  
**Title:** SA1 – Project Hub Auto-Organizer  
**Version:** v1.3 (2025-09-23)  
**Authors:** Akeil (PM), Dev A (Backend), Dev B (Frontend), Dev C (Infra)  
**Scope:** Consolidate files from multiple sources into a single searchable hub; dedupe (hash), tag (rules), and surface via web UI.  
**Assumptions:** One org → many workspaces; OAuth to providers; read-only scopes where possible.

**Rationale:** Establishes scope, ownership, and assumptions so all team members and reviewers start from the same baseline.

---

## 1) Architecture Diagram (text)  
### Components & where they run
- **Client (Browser):** `DashboardPage`, `FileBrowser`, `SearchBar`, `SettingsPage`, `NotificationsPane` (React 18 + TS + Tailwind).  
- **Backend (Cloud/Containers, Node 20 + TS):**  
  `AuthGateway` (Clerk validation), `HubAPI` (REST+GraphQL), `ConnectorService`, `SyncOrchestrator`, `Ingestor`, `Normalizer`, `Deduplicator`, `Indexer` (PG FTS), `WebhookHandler`, `Scheduler`, `AuditLogger`, `AccessControl`.  
- **Persistence:** **Postgres 16** (primary + FTS), **Blob Store** (S3/GCS previews/extracts), **Redis** (jobs/locks).  
- **Integrations:** `GoogleDriveConnector`, `DropboxConnector`, `OneDriveConnector`, `NotionConnector`, `GitHubConnector`.

### Information flows
1. **Auth:** Client → `AuthGateway` (Clerk JWT) → `HubAPI`.  
2. **Connector link:** Client → `HubAPI` → `ConnectorService` → Provider OAuth → secrets stored in PG.  
3. **Full sync:** `Scheduler` → `SyncOrchestrator` → (`Ingestor` → `Normalizer` → `Deduplicator` → `Indexer`) → PG/Blob.  
4. **Delta sync:** Provider → `WebhookHandler` → same pipeline.  
5. **Search/Browse:** Client → `HubAPI` → PG (FTS).  
6. **Audits:** Privileged actions → `AuditLogger` → PG.

**Rationale:** Shows runtime boundaries, components, and data flow clearly, reducing risk of hidden dependencies.

---

## 2) Class Diagram (conceptual)  
- **Services (backend):** `AuthGateway`, `HubAPI`, `ConnectorService`, `SyncOrchestrator`, `Ingestor`, `Normalizer`, `Deduplicator`, `Indexer`, `WebhookHandler`, `Scheduler`, `AuditLogger`, `AccessControl`.  
- **Jobs:** `WorkerJob` ← {`FullSyncJob`, `DeltaSyncJob`, `WebhookJob`, `ReindexJob`}.  
- **Connectors:** `ConnectorBase` ← {`GoogleDriveConnector`, `DropboxConnector`, `OneDriveConnector`, `NotionConnector`, `GitHubConnector`}.  
- **Repositories:** `RepositoryBase` ← {`UserRepository`, `WorkspaceRepository`, `ConnectorRepository`, `FileRepository`, `TagRepository`, `AuditRepository`, `JobRepository`}.  
- **Domain:** `FileEntity` aggregates `FileVersion` + `ExternalPointer`; many-to-many `Tag`.

**Rationale:** Aligns code artifacts with architecture, ensuring design consistency across diagrams and lists.

---

## 3) List of Classes  
### Client (React)
- `DashboardPage`, `FileBrowser`, `SearchBar`, `SettingsPage`, `NotificationsPane`.

### Backend (Node/TS)
- `AuthGateway`, `HubAPI`, `ConnectorService`, `SyncOrchestrator`, `Ingestor`, `Normalizer`, `Deduplicator`, `Indexer`, `WebhookHandler`, `Scheduler`, `AuditLogger`, `AccessControl`.

### Persistence & Integrations
- Repos: `UserRepository`, `WorkspaceRepository`, `ConnectorRepository`, `FileRepository`, `TagRepository`, `AuditRepository`, `JobRepository`.  
- Connectors: `GoogleDriveConnector`, `DropboxConnector`, `OneDriveConnector`, `NotionConnector`, `GitHubConnector`.

**Rationale:** Prevents discrepancies by making every component explicit and traceable.

---

## 4) State Diagrams  
### File lifecycle  
`Discovered → Ingested → Normalized → Deduped → Indexed → Available`  
Error states: `AuthExpired`, `RateLimited`, `ProviderError`, `IndexError`.

### Connector lifecycle  
`Unlinked → Linking → Linked → Active` (+ `Suspended`, `ReauthRequired`).

**Rationale:** Defines valid state transitions to guide implementation and recovery.

---

## 5) Flow Chart (primary scenario)  
**First-time setup:** Login (Clerk) → Add Connector (Settings) → OAuth → `Linked` → Enqueue `FullSyncJob` → Ingest → Normalize → Deduplicate → Index → Files visible on Dashboard/FileBrowser.  
**Secondary:** Provider webhook → Enqueue `WebhookJob` → pipeline → update hub.

**Rationale:** Captures “happy path” and common workflows so devs align front and back.

---

## 6) Development Risks and Failures  
- Token expiry → mark `ReauthRequired`; resume post re-auth.  
- Webhook surge → queue depth alerts, idempotent jobs.  
- FTS perf → GIN indexes, analyzer tuning.  
- Dedupe errors → strict hash default, manual override.  
- API drift → connector contract tests.  
- Secrets compromise → KMS, rotation, revoke on leak.

**Rationale:** Makes risks explicit with strategies, avoiding vague mitigation promises.

---

## 7) Technology Stack  
- **Frontend:** React 18 + TypeScript + Tailwind.  
- **Backend:** Node 20 + TypeScript.  
- **APIs:** REST (OpenAPI 3.1) + GraphQL.  
- **Auth:** Clerk.  
- **Data:** Postgres 16 (FTS), Redis, S3/GCS.  
- **No ML, no observability (basic logs only).**

**Rationale:** Lightweight stack reduces ops burden but delivers required features.

---

## 8) APIs (HubAPI)  
### REST  
- `POST /connectors` → create connector  
- `POST /connectors/{id}/sync` → trigger sync  
- `GET /files?query=&cursor=` → list files  
- `GET /files/{id}` → file detail  
- `POST /rules/dedupe` → update dedupe rules  
- `GET /audits?filter=` → list audits  
- `POST /webhooks/{provider}` → enqueue delta job

### GraphQL  
```graphql
type File {
  id: ID!
  title: String!
  mimeType: String
  size: Int
  owner: String
  source: Source!
  tags: [Tag!]!
  versions: [FileVersion!]!
  modifiedAt: String!
  permalink: String
}

type Query {
  files(filter: FileFilter, after: String): FileConnection!
  file(id: ID!): File
  tags: [Tag!]!
}

type Mutation {
  createConnector(input: CreateConnectorInput!): Connector!
  triggerSync(connectorId: ID!, mode: SyncMode!): Job!
  upsertDedupeRules(input: DedupeRulesInput!): Boolean!
}
```

**Rationale:** Provides a stable, developer-friendly contract for clients.

---

## 9) Public Interfaces  
- Client ↔ HubAPI (REST/GraphQL).  
- Provider ↔ WebhookHandler (signed POST).  
- Admin ↔ HubAPI (`GET /audits`).

**Rationale:** Defines external touchpoints clearly, preventing accidental exposure.

---

## 10) Data Schemas (Postgres 16)  
- **users**: `id`, `email`, `name`, `org_id`, `created_at`  
- **workspaces**: `id`, `org_id`, `name`, `settings`, `created_at`  
- **connectors**: `id`, `workspace_id`, `provider`, `scopes`, `status`, `created_at`, `updated_at`  
- **connector_secrets**: `connector_id`, `refresh_token`, `access_expires`, `provider_user_id`  
- **files**: `id`, `workspace_id`, `title`, `mime_type`, `size`, `owner`, `source`, `hash_sha256`, `canonical_id`, `searchable_text`, `created_at`, `updated_at`  
- **file_versions**: `id`, `file_id`, `external_pointer_id`, `version_no`, `modified_at`, `checksum_sha256`  
- **external_pointers**: `id`, `provider`, `provider_file_id`, `permalink`, `cursor`  
- **tags**: `id`, `workspace_id`, `name`, `kind`  
- **file_tags**: `file_id`, `tag_id`  
- **jobs**: `id`, `type`, `status`, `payload`, `retries`, `next_run`, `created_at`  
- **audits**: `id`, `actor`, `action`, `resource`, `meta`, `at`

**Rationale:** Defines exact DB schema, ensuring devs and repos stay aligned.

---

## 11) Security & Privacy  
- **AuthN:** Clerk (JWT validated server-side).  
- **AuthZ:** AccessControl (RBAC).  
- **Secrets:** Encrypted refresh tokens; rotated 90 days.  
- **Transport:** TLS 1.3, secure cookies.  
- **Webhooks:** HMAC signatures + nonce.  
- **PII:** Limited to names/emails/provider IDs; only for auth/audit.  
- **Retention:** Workspace deletions propagate to data.

**Rationale:** Centralizes mandatory guarantees, protecting orgs and users.

---

## 12) Risks to Completion  
- OAuth edge cases → sandbox testing.  
- PG FTS tuning → relevance fallback.  
- Dedupe → start hash-only; manual overrides.  
- Webhook scale → backpressure + idempotency.  
- UX clarity → guided setup + health checks.

**Rationale:** Flags top blockers with mitigation, ensuring delivery on schedule.

---

## Final Consistency Check  
- Classes in architecture, diagrams, lists, APIs, and schema all match.  
- Public flows tie directly to REST/GraphQL endpoints.  
- Schema aligns with entities referenced by jobs and APIs.  
- Tech choices (Clerk, PG FTS, no ML/observability) are consistently applied.  
