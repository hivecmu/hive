# SA2 --- Communication Structure Recommender

## 0. Header

-   **Title:** SA2 -- Communication Structure Recommender\
-   **Version:** v1.0 (2025-09-23)\
-   **Authors:** Akeil (PM), Dev A (Backend), Dev B (Frontend), Dev C
    (Infra)\
-   **Scope:** Recommend channel and subgroup structures for clubs
    (Slack/Discord style) using deterministic heuristics, constraints,
    and optional imports.\
-   **Assumptions:** One org → many communities; optional read-only
    imports; all recommendations are previewed before applied.

**Rationale:** Establishes project scope, ownership, and assumptions so
the team is aligned before digging into design.

------------------------------------------------------------------------

## 1. Architecture Diagram (text)

### Components & Deployment

-   **Client (React 18 + TS + Tailwind)**\
    `DashboardPage`, `CommunityWizard`, `RecommendationView`,
    `RuleEditor`, `ChangeSetPreview`, `AuditPane`

-   **Backend (Node 20 + TS)**\
    `AuthGateway` (Clerk JWT validation),\
    `Gateway` (REST + GraphQL endpoints),\
    `HeuristicEngine` (rule-based scoring),\
    `BlueprintBuilder` (channel/subgroup blueprinting),\
    `ChangePlanner` (diff computation),\
    `AccessControl` (RBAC),\
    `AuditLogger` (writes audits),\
    `SlackConnector`, `DiscordConnector` (imports),\
    `Scheduler`, `JobWorker` (Redis-backed jobs)

-   **Persistence**\
    Postgres 16 (primary DB + FTS),\
    Redis (jobs/locks; optional)

### Data Flows

1.  Client → Clerk JWT → `AuthGateway` → `Gateway`\
2.  Optional imports: `Scheduler` → `Connector` → PG\
3.  Admin input: Client → `Gateway` → save metadata, rules\
4.  Recommender: `Gateway` → `HeuristicEngine` → `BlueprintBuilder` →
    `ChangePlanner` → PG\
5.  Client fetches blueprint + changeset\
6.  Audit logs written to PG

**Rationale:** Clarifies runtime boundaries and how information moves
through the system.

------------------------------------------------------------------------

## 2. Class Diagram (conceptual)

-   **API Layer**\
    `AuthGateway`, `Gateway`

-   **Core**\
    `HeuristicEngine` (uses `RuleSet`, `Constraint`, `Scorer`)\
    `BlueprintBuilder`\
    `ChangePlanner`\
    `AccessControl`\
    `AuditLogger`

-   **Domain**\
    `Community`, `Membership`, `Channel`, `Subgroup`\
    `RuleSet`, `Rule`, `Constraint`, `Recommendation`, `Blueprint`,
    `ChangeSet`

-   **Integrations**\
    `SlackConnector`, `DiscordConnector`

-   **Jobs**\
    `Scheduler`, `JobWorker`, `ImportJob`, `RecomputeJob`

**Rationale:** Shows ownership of responsibilities and dependencies at a
glance.

------------------------------------------------------------------------

## 3. List of Classes

-   **API:** `AuthGateway`, `Gateway`\
-   **Core:** `HeuristicEngine`, `BlueprintBuilder`, `ChangePlanner`,
    `AccessControl`, `AuditLogger`\
-   **Domain:** `Community`, `Membership`, `Channel`, `Subgroup`,
    `RuleSet`, `Recommendation`, `Blueprint`, `ChangeSet`\
-   **Integrations:** `SlackConnector`, `DiscordConnector`\
-   **Jobs:** `Scheduler`, `JobWorker`, `ImportJob`, `RecomputeJob`

**Rationale:** Provides the canonical list of classes so nothing is
"phantom" or implied.

------------------------------------------------------------------------

## 4. State Diagrams

### Recommendation Lifecycle

    Draft → Tuned → Approved → Published → Archived

### Import Lifecycle

    Unlinked → Linked → Importing → Imported → Stale

**Rationale:** Makes valid states explicit and ties them to API
operations.

------------------------------------------------------------------------

## 5. Flow Chart (primary scenario)

**Scenario SA2.S1 -- Create Structure**

1.  Login (Clerk)\
2.  Create community (inputs: size, goals, constraints)\
3.  (Optional) Import current workspace\
4.  Run `HeuristicEngine`\
5.  Show `Blueprint` + `ChangeSet`\
6.  Admin reviews + approves\
7.  Export checklist/scripts

**Rationale:** Defines one path to value, which is testable end-to-end.

------------------------------------------------------------------------

## 6. Development Risks & Failures

-   **Over-recommendation** (too many channels) → cap by constraints\
-   **Insufficient signal** (no import) → use defaults, flag confidence\
-   **Connector rate limits** → backoff, caching\
-   **Rule conflicts** → precedence (constraints \> defaults \> system
    rules)\
-   **Approval churn** → version recommendations + rollback

**Rationale:** Turns abstract risks into actionable recovery strategies.

------------------------------------------------------------------------

## 7. Technology Stack

-   **Frontend:** React 18 + TS + Tailwind (shadcn/ui optional)\
-   **Backend:** Node 20 + TS\
-   **APIs:** REST (OpenAPI 3.1), GraphQL\
-   **Auth:** Clerk\
-   **Data:** Postgres 16 + Redis (optional)\
-   **Excluded:** ML, Observability tooling

**Rationale:** Consistent stack across specs; reduces operational
variance.

------------------------------------------------------------------------

## 8. APIs

### REST (OpenAPI excerpts)

-   `POST /communities` → create community\
-   `POST /communities/{id}/import` → trigger import (Slack/Discord)\
-   `PUT /rulesets/{id}` → upsert rules\
-   `POST /recommendations:compute` → run recommender\
-   `GET /blueprints/{id}` → fetch blueprint\
-   `POST /changesets/{id}/approve` → approve recommendation\
-   `POST /changesets/{id}/publish` → publish + export checklist\
-   `GET /audits` → list audits

### GraphQL (read-heavy)

``` graphql
type ChannelPlan { name: String!, purpose: String!, access: String!, archived: Boolean! }
type SubgroupPlan { name: String!, membersEstimate: Int!, channels: [ChannelPlan!]! }

type Blueprint {
  id: ID!
  communityId: ID!
  summary: String!
  channels: [ChannelPlan!]!
  subgroups: [SubgroupPlan!]!
  namingRules: [String!]!
}

type Recommendation {
  id: ID!
  blueprint: Blueprint!
  score: Float!
  constraintsViolated: [String!]!
  state: String!
}

type Query {
  blueprint(id: ID!): Blueprint
  recommendations(communityId: ID!): [Recommendation!]!
}

type Mutation {
  computeRecommendation(communityId: ID!): Recommendation!
  approveChangeSet(changeSetId: ID!): Boolean!
}
```

**Rationale:** REST for commands, GraphQL for nested data; keeps client
queries efficient.

------------------------------------------------------------------------

## 9. Public Interfaces

-   **Client ↔ API:** Clerk-authenticated; REST mutations, GraphQL
    reads\
-   **External Providers:** Slack/Discord imports (read-only); outputs
    are scripts/checklists only\
-   **Admins:** Audit log access + rule presets

**Rationale:** Clear boundaries make integrations safer and simpler.

------------------------------------------------------------------------

## 10. Data Schemas (Postgres 16)

*All PKs are UUID v7, all times `timestamptz` (UTC). FTS on names.*

-   **communities**: `id`, `org_id`, `name`, `description`,
    `created_at`, `updated_at`\
-   **memberships**: `id`, `community_id`, `user_id`, `role`,
    `created_at`\
-   **imports**: `id`, `community_id`, `provider`, `status`,
    `payload jsonb`, `created_at`, `updated_at`\
-   **rulesets**: `id`, `community_id`, `constraints jsonb`,
    `weights jsonb`, `created_at`, `updated_at`\
-   **recommendations**: `id`, `community_id`, `ruleset_id`, `score`,
    `state`, `created_at`, `updated_at`\
-   **blueprints**: `id`, `recommendation_id`, `summary`,
    `naming_rules jsonb`, `channels jsonb`, `subgroups jsonb`,
    `archived_at`\
-   **changesets**: `id`, `recommendation_id`, `diff jsonb`,
    `approved_by`, `approved_at`, `published_at`\
-   **audits**: `id`, `actor`, `action`, `resource`, `meta jsonb`,
    `at timestamptz`

**Rationale:** Mirrors the domain model; keeps recommendations auditable
and reversible.

------------------------------------------------------------------------

## 11. Security & Privacy

-   **AuthN:** Clerk JWTs verified by `AuthGateway`\
-   **AuthZ:** RBAC at org → community → resource\
-   **PII:** Names/emails limited to auth + audits\
-   **Transport:** TLS 1.3; secure cookies (httpOnly, sameSite=strict)\
-   **Connectors:** Read-only tokens, encrypted at rest, rotated every
    90 days\
-   **Auditing:** All approvals/publishes logged\
-   **Retention:** Community deletion cascades; audit logs per policy

**Rationale:** Provides minimum viable guarantees to keep org/student
data safe.

------------------------------------------------------------------------

## 12. Risks to Completion

-   **Heuristic quality disagreements** → allow rule/weight tuning +
    rationales\
-   **Connector API drift** → capability flags + contract tests\
-   **Scope creep to auto-apply** → v1 exports only; human-in-the-loop\
-   **Scaling issues (1k+ channels)** → batching, pagination, GIN
    indices\
-   **Governance disputes** → versioned blueprints, rollback support

**Rationale:** Flags highest-probability blockers so PM/eng can
prioritize testing.

------------------------------------------------------------------------

## 13. Heuristic Engine (Deterministic)

-   **Inputs:** community size, committees, events, recruiting,
    moderation capacity, pain points, optional import\
-   **Rules:**
    -   Create `#announcements` (write: officers, read: all)\
    -   Add `workstreams/*` if \>N initiatives\
    -   Enforce naming: `<org>-<topic>-<scope>`\
    -   Suggest archival for inactive \>X days\
    -   Subgroups if committees/size thresholds exceeded\
-   **Scoring:** coverage + simplicity -- overlap penalty\
-   **Outputs:** `Blueprint`, `ChangeSet`, rationale text

**Rationale:** Explainable, tunable, and usable without ML.

------------------------------------------------------------------------

## 14. Public UI Flows

-   **CommunityWizard:** capture inputs/constraints/import\
-   **RecommendationView:** show blueprint + rationale + "channel
    budget"\
-   **RuleEditor:** tweak rules, rerun\
-   **ChangeSetPreview:** diff view + export checklist/scripts\
-   **AuditPane:** show approval/publish history

**Rationale:** Maps UI directly to API states, making UX predictable.

------------------------------------------------------------------------

## 15. Consistency Check

-   Classes appear in all diagrams and lists.\
-   State transitions map to API endpoints.\
-   Data schemas mirror domain + audits.\
-   Stack consistent with org standards (React/TS/Tailwind +
    Node/PG/Clerk).

**Rationale:** Prevents drift and misalignment across documents.

------------------------------------------------------------------------
