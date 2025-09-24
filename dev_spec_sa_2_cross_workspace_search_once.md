# Dev Spec — SA2: Cross-Workspace “Search Once”

## 0) Header
**Title:** SA2 – Cross-Workspace “Search Once”

**Version:** v1.0 (2025-09-24)

**Scope:** Provide a single search box inside the Slack app that queries across **all connected workspaces and content providers** (Slack, email, cloud drives, wikis, code hosts) and returns **deduplicated, permission-aware** results with fast filtering. This feature **depends on SA1 – Project Hub Auto-Organizer** for unified ingestion, normalization, deduplication, and indexing.

**Assumptions:**
- SA1 provides a consolidated, deduped corpus with FTS indices and provenance per item.
- One org → many workspaces (Slack workspaces & other providers) authenticated via OAuth; read-only scopes where possible.
- Search must respect provider/source permissions and Slack’s user identity mapping.

**Rationale:** Students under time pressure shouldn’t guess platforms. A single query must surface the right files/messages fast, with zero context switching.

**Primary User Story (SA2.U1):**
> As a student under time pressure, I want a cross-workspace “search once” function so that I can quickly find files or messages without guessing the platform.

**User Story Relationship:**
- **SA1 – Project Hub Auto-Organizer**: *“As a student team leader, I want to automatically organize project files into one central hub so that no one wastes time searching across multiple platforms.”*  
- **SA2 – Cross-Workspace Search**: *“As a student under time pressure, I want a cross-workspace ‘search once’ function so that I can quickly find files or messages without guessing the platform.”*  

**Dependency Explanation:** SA2 relies directly on SA1. SA1 ingests, normalizes, deduplicates, and indexes content into a central hub. SA2 does not re-ingest; it queries that hub to power the search experience. SA1 provides the **foundation (organized corpus, provenance, permissions, and FTS index)**, while SA2 delivers the **user experience (query planning, ranking, snippets, and Slack UI)**. This ensures that search results are accurate, permission-aware, and fast, without duplicating ingestion logic.

---

## 1) Architecture Diagram (text)
**Modules and Components** (boxes → classes listed in §3; labels in parentheses)

### Client (Slack App – React 18 + TS)
- SearchHomeView (SA2.C1)
- SearchInputBar (SA2.C2)
- ResultsList (SA2.C3)
- FacetFilters (SA2.C4)
- ResultPreviewPane (SA2.C5)
- RecentSearches (SA2.C6)
- SettingsModal (SA2.C7)
- NotificationToast (SA2.C8)

### Backend (Node 20 + TS)
- SearchAPI (REST+GraphQL) (SA2.B1)
- QueryPlanner (SA2.B2)
- PermissionsResolver (SA2.B3)
- RankingService (SA2.B4)
- SnippetService (SA2.B5)
- SuggestService (auto-complete) (SA2.B6)
- MetricsLogger (SA2.B7)
- AccessControl (SA2.B8)

### Dependencies (from SA1)
- Indexer/Corpus (PG FTS) (SA1.B9)
- Canonical Entities (Files, Messages, Tags) (SA1.D*)
- AuditLogger (SA1.B12)
- ConnectorService (SA1.B3)

### Persistence
- Postgres 16 (FTS, search logs, sessions) (SA2.P1)
- Redis (search cache, hot facets) (SA2.P2)

### Integrations
- Slack OAuth & user identity mapping (SA2.I1)
- SA1 HubAPI (internal) (SA2.I2)

**Information Flows**
1. **Search Submit:** Client → SearchAPI.
2. **Plan & Resolve:** SearchAPI → QueryPlanner → PermissionsResolver → SA1 corpus.
3. **Execute:** QueryPlanner → PG FTS (SA1 Index) → collect candidates.
4. **Rank & Snippet:** RankingService orders results; SnippetService builds highlights.
5. **Respond:** SearchAPI → Client with page/cursor, facets, and snippets.
6. **Metrics & Audit:** MetricsLogger → PG; AuditLogger (via SA1) for compliance.

**Rationale:** Separates concerns: plan/permissions/rank/snippet so we can tune each without breaking others.

---

## 2) Class Diagram (conceptual)
### Backend Core
**SearchAPI (SA2.B1)**
- Fields: httpServer: HttpServer, gqlServer: GraphQLServer
- Methods: postSearch(req: SearchRequest): Promise<SearchResponse>, getSuggest(q: string): Promise<SuggestResponse>, getFacets(q: string): Promise<FacetResponse>

**QueryPlanner (SA2.B2)**
- Fields: analyzers: Analyzer[], defaultScope: SearchScope
- Methods: plan(query: QuerySpec): PlannedQuery, expandFilters(f: FilterSpec): FilterSpec

**PermissionsResolver (SA2.B3)**
- Fields: identityMapper: IdentityMap, policy: RBACPolicy
- Methods: resolveUserScopes(userId: UUID): ScopeSet, filterByPerm(items: Item[], user: User): Item[]

**RankingService (SA2.B4)**
- Fields: weights: RankWeights, recencyHalfLifeDays: number
- Methods: score(items: Item[], context: RankContext): RankedItem[]

**SnippetService (SA2.B5)**
- Fields: highlighter: Highlighter, maxLen: number
- Methods: buildSnippets(items: Item[], q: string): ItemWithSnippets[]

**SuggestService (SA2.B6)**
- Fields: trie: PrefixTrie, popular: LruCache<string, number>
- Methods: suggest(prefix: string, user: User): Suggestion[]

**MetricsLogger (SA2.B7)**
- Fields: sink: PgClient
- Methods: logQuery(meta: QueryLog): void, logClick(meta: ClickLog): void

**AccessControl (SA2.B8)**
- Fields: policy: RBACPolicy
- Methods: canSearch(user: User, scope: Scope): boolean

### Client (Slack App)
**SearchHomeView (SA2.C1)**
- Fields: state: UIState
- Methods: render(), onSubmit(), onFilterChanged()

**SearchInputBar (SA2.C2)**
- Fields: value: string
- Methods: onChange(v: string), onSubmit(), onSuggest()

**ResultsList (SA2.C3)**
- Fields: items: ResultItem[], cursor: Cursor
- Methods: onSelect(id: UUID), onLoadMore()

**FacetFilters (SA2.C4)**
- Fields: providers: Provider[], types: DocType[], dates: DateRange
- Methods: onToggle(), onApply()

**ResultPreviewPane (SA2.C5)**
- Fields: activeItem?: ResultItem
- Methods: renderPreview(item: ResultItem)

**RecentSearches (SA2.C6)**
- Fields: entries: RecentEntry[]
- Methods: show(), select(entryId: UUID)

**SettingsModal (SA2.C7)**
- Fields: defaultScope: SearchScope, keyboardShortcuts: Shortcut[]
- Methods: save(), restoreDefaults()

**NotificationToast (SA2.C8)**
- Fields: message: string, level: 'info'|'warn'|'error'
- Methods: show(msg: string), dismiss()

### Data Structures (SA2.D*)
- **SearchRequest**: { q: string, scope: 'workspace'|'org'|'all', filters: FilterSpec, pageSize: int, cursor?: string }
- **SearchResponse**: { items: ResultItem[], facets: FacetCounts, cursor?: string, tookMs: int }
- **ResultItem**: { id: UUID, title: string, type: DocType, snippet: string, source: Source, modifiedAt: timestamptz, owner: string, permalink?: string }
- **FilterSpec**: { providers?: Provider[], types?: DocType[], dateFrom?: timestamptz, dateTo?: timestamptz, owners?: string[] }
- **RankWeights**: { text: number, recency: number, clickPrior: number, sourceBoost: Map<Source, number> }

---

## 3) List of Classes (by module)
**Client (Slack App)**
- SA2.C1 SearchHomeView – Top-level view inside Slack; orchestrates search and results.
- SA2.C2 SearchInputBar – Query entry + suggestions.
- SA2.C3 ResultsList – Virtualized list of results with infinite scroll.
- SA2.C4 FacetFilters – Provider/type/date/owner filters.
- SA2.C5 ResultPreviewPane – Inline preview (file/message snippet) where allowed.
- SA2.C6 RecentSearches – Local recent terms and server-side pinned queries.
- SA2.C7 SettingsModal – Defaults and shortcuts.
- SA2.C8 NotificationToast – Non-blocking feedback.

**Backend (Node/TS)**
- SA2.B1 SearchAPI – REST+GraphQL endpoints.
- SA2.B2 QueryPlanner – Query parsing, filter expansion.
- SA2.B3 PermissionsResolver – Scope calc & per-item filtering.
- SA2.B4 RankingService – Final scoring and ordering.
- SA2.B5 SnippetService – Highlighted snippets.
- SA2.B6 SuggestService – Typeahead.
- SA2.B7 MetricsLogger – Queries/clicks logs.
- SA2.B8 AccessControl – RBAC decisions.

**Persistence & Integrations**
- SA2.P1 Postgres 16 – search_logs, search_sessions, saved_queries.
- SA2.P2 Redis – hot results cache, suggestions cache.
- SA2.I1 Slack OAuth/Identity – map Slack user → org user.
- SA2.I2 SA1 HubAPI – internal calls to query corpus/index.

**Note:** SA2 introduces no new connectors. All source content is provided by SA1.

---

## 4) State Diagrams
### Query Lifecycle States (SA2.S1)
- **Idle** → **Typing** → **Planned** → **Executing** → **Ranked** → **Rendered**
- Error branches: **RateLimited**, **AuthExpired**, **NoResults**, **PartialResults**

**Transitions & Methods**
- Idle → Typing: Client.SearchInputBar.onChange()
- Typing → Planned: Backend.QueryPlanner.plan()
- Planned → Executing: Backend.SearchAPI.postSearch()
- Executing → Ranked: Backend.RankingService.score()
- Ranked → Rendered: Client.ResultsList.render()
- Any → AuthExpired: Backend.PermissionsResolver.filterByPerm() detects missing token
- Executing → PartialResults: Backend.SearchAPI posts partial with warning (timeouts)

### Identity/Scope Resolution (SA2.S2)
- **Unmapped** → **MappedToOrg** → **ScopesResolved** → **PermsApplied**
- Methods: Backend.PermissionsResolver.resolveUserScopes(), filterByPerm()

**Initial States:** Idle (S1), Unmapped (S2)

---

## 5) Flow Chart (primary scenario SA2.U1)
**Narrative:** User focuses the Slack app search box, types a query, selects a filter for “All Providers,” and hits Enter. The system resolves identity and scopes, plans the query, executes against the SA1 index, ranks and snippets results, and renders the first page with facets. User opens preview, copies permalink, and shares.

**Key Steps → State Labels**
1. Focus search (Idle→Typing – SA2.S1)
2. Submit query (Typing→Planned – QueryPlanner.plan())
3. Resolve identity & scope (Unmapped→PermsApplied – SA2.S2)
4. Execute FTS (Planned→Executing – SearchAPI.postSearch())
5. Score & snippet (Executing→Ranked – RankingService, SnippetService)
6. Render page (Ranked→Rendered – ResultsList.render())
7. Interact with facets/pagination (Rendered→Planned/Executing loops)

**Start:** Idle; **End:** Rendered

---

## 6) Development Risks and Failures (with recovery)
- **R1: Permission leaks via stale tokens** – Mitigate with short-lived access tokens, server-side checks each request; re-auth flow in SettingsModal.
- **R2: Slow queries on large corpora** – Use generated tsvector + GIN, pre-computed facets, Redis cache for popular queries, result caching keyed by (q, filters, scope, userId).
- **R3: Ranking dissatisfaction** – Expose sort by Modified/Owner; adjustable weights behind a feature flag; offline A/B using query logs.
- **R4: Snippet truncation on binary/PDF** – Fall back to title/metadata; show “Open at source.”
- **R5: Multi-workspace identity mismatch** – Maintain authoritative identity map; on conflicts, degrade to per-provider checks only.
- **R6: Slack app rate limits** – Batch UI updates; exponential backoff; surface PartialResults with retry option.
- **R7: SA1 index lag** – Show freshness banner; offer “Request reindex” (queued via SA1 ReindexJob).

---

## 7) Technology Stack (locked)
- **Frontend:** React 18 + TypeScript (Slack App Home & Modals), Tailwind (optional)
- **Backend:** Node 20 + TypeScript
- **APIs:** REST (OpenAPI 3.1) + GraphQL (/graphql)
- **Auth:** Slack OAuth for app install + Clerk JWT for session validation (server-side)
- **Data:** Postgres 16 (FTS + logs), Redis (cache)
- **No ML/Vector search** in v1; rely on SA1’s PG-FTS.

---

## 8) APIs (public surface via SearchAPI)
### 8.1 REST (examples)
- **POST /search** → body: SearchRequest → **200** SearchResponse
- **GET /suggest?q=** → **200** SuggestResponse
- **GET /facets?q=&filters=** → **200** FacetResponse
- **POST /saved-queries** → SaveQueryRequest → **201** SavedQuery
- **GET /saved-queries** → **200** SavedQuery[]

**Types**
- **SearchRequest** { q: string; scope: 'workspace'|'org'|'all'; filters?: FilterSpec; pageSize?: int; cursor?: string }
- **SearchResponse** { items: ResultItem[]; facets: FacetCounts; cursor?: string; tookMs: int; warnings?: string[] }

### 8.2 GraphQL (selected)
```
type ResultItem { id: ID!, title: String!, type: String!, source: String!, owner: String, modifiedAt: String!, snippet: String, permalink: String }

type FacetCounts { providers: [Facet!]!, types: [Facet!], owners: [Facet!], dates: [Facet!] }

type Facet { name: String!, count: Int! }

type Query {
  search(q: String!, scope: String, filters: JSON, after: String): SearchConnection!
  suggest(prefix: String!): [String!]!
}

type SearchConnection { edges: [ResultEdge!]!, pageInfo: PageInfo!, facets: FacetCounts!, tookMs: Int! }

type ResultEdge { node: ResultItem!, cursor: String! }

type PageInfo { endCursor: String, hasNextPage: Boolean! }
```

---

## 9) Public Interfaces (who calls what)
- **Client ↔ SearchAPI:** REST for search/suggest/facets; GraphQL for infinite-scroll reads and rich fragments for previews.
- **SearchAPI ↔ SA1 HubAPI:** Internal gRPC/REST to query canonical corpus and retrieve item metadata/permalinks.
- **Admin:** GET /saved-queries; metrics dashboards (internal only).

---

## 10) Data Schemas (Postgres 16)
**search_logs (SA2.DB1)**
- id UUID PK, user_id UUID, org_id UUID, q text, filters jsonb, scope text, took_ms int, result_count int, created_at timestamptz

**click_logs (SA2.DB2)**
- id UUID PK, user_id UUID, org_id UUID, item_id UUID, source text, rank int, clicked_at timestamptz

**saved_queries (SA2.DB3)**
- id UUID PK, user_id UUID, org_id UUID, name text, q text, filters jsonb, scope text, created_at timestamptz

**identity_map (SA2.DB4)**
- id UUID PK, user_id UUID, provider text, provider_user_id text, last_seen timestamptz

**caches (SA2.DB5)**
- key text PK, value bytea, expires_at timestamptz

**Note:** Content entities (files/messages/tags) remain defined by SA1 tables.

---

## 11) Security & Privacy
**PII (temporary):** user_id, provider_user_id (mapped), query text, click events. Needed for permissions, relevance, and abuse prevention. Transport over TLS; server-side only.

**PII (long-term):** minimal logs (search_logs/click_logs), saved_queries names/terms. Retention: 90 days for logs; user-deleted on request. Encryption at rest for logs; role-based access to tables.

**Access Control:** RBAC by org/workspace; every item checked against PermissionsResolver using SA1 provenance + provider scopes.

**Auditing:** All search and admin actions logged via SA2.DB1/

