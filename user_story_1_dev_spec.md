1 - Updated Backend Development Specifications
User Story 1
Header


**Title: AI-Generated Slack Workspace Structure (User Story #1)**


Authors: Akeil Smith, Lexi Kronowitz, Miguel Almeida


Version/Date: v1.1 — 2025‑10‑21


User Story: As a project manager, I want Slack to use AI to automatically generate and create an optimized structure for workspaces, channels, and subgroups so that communication is organized, clear, and scalable from the start without requiring manual setup.


Outcome: A Slack app that proposes and applies an information architecture (channels, user groups, naming conventions, topics/purposes, and starter workflows) on Day 0, with human‑in‑the‑loop approval.


Primary KPIs: Time to first usable structure (<10 min), % proposals accepted without edits (>60%), channel sprawl reduction after 30 days (≥25%), PM satisfaction (CSAT ≥ 4/5).


**Architecture Diagram**

![ alt text](u1_arch.png)

flowchart LR
 subgraph slack_client ["Slack Client (User Workspace)"]
   H[Home Tab]
   M[Config/Review Modal]
   SC[/Slash Commands/]
   SHT[(Shortcuts)]
 end


 subgraph backend ["Backend (Cloud)"]
   API[Events & Interactions API]
   ORC[Orchestrator Service]
   AI["AI Engine\n(LLM + Heuristics + Evaluator)"]
   SLI[Slack Integration Layer]
   DB[(PostgreSQL + pgvector)]
   Q[(Queue)]
   REDIS[(Redis Cache)]
   S3[(Artifact Storage)]
   OBS[(Telemetry/Logs)]
 end


 subgraph third_party ["Third-Party"]
   LLM[(Model Provider)]
   DLP[(PII Redaction)]
 end


 SC --> API
 SHT --> API
 H <--> API
 M <--> API


 API --> ORC
 ORC -->|create job| DB
 ORC -->|enqueue| Q
 ORC --> AI
 AI -->|proposal| DB
 AI --> LLM
 ORC --> SLI
 SLI -->|"Slack Web API"| slack_platform[Slack Platform]
 ORC --> S3
 ORC --> OBS
 ORC <--> REDIS
 ORC --> DLP




Explanation: User actions in Slack (slash commands, shortcuts, Home, Modals) hit our Events/Interactions API. The Orchestrator creates a job, harvests Slack context via the Integration Layer, builds prompts and sends them to the AI Engine. The engine combines LLM output and rule‑based evaluation to yield a StructureProposal saved in PostgreSQL. The user reviews/edits in a modal; upon approval, the Orchestrator applies the blueprint via Slack Web API. Queue regulates rate‑limited operations. Redis stores short‑lived state/locks. S3 stores artifacts (prompt, proposal, diffs). Observability captures metrics and traces. Optional DLP redacts PII before prompts.
2b. Information Flows: Trigger → Intake → Context Harvesting → Synthesis → Guardrails → Review → Apply → Audit/Feedback. Each step persists state to the database and emits telemetry.
Class Diagram



**classDiagram**

![ alt text](u1_class.png)
  class StructureJob {
    +UUID id
    +String workspaceId
    +JobStatus status
    +String createdByUserId
    +Instant createdAt
    +Instant updatedAt
    +start()
    +advance(to: JobStatus)
    +fail(reason: String)
  }

  class IntakeForm {
    +UUID id
    +UUID jobId
    +String projectName
    +String department
    +String timeline
    +String[] stakeholders
    +String[] goals
    +String[] constraints
  }

  class SlackContext {
    +User[] users
    +Channel[] existingChannels
    +UserGroup[] userGroups
    +UsageSignals usage
  }

  class Policy {
    +UUID id
    +String type
    +Map~String,Any~ rules
    +validate(p: StructureProposal): ValidationResult
  }

  class StructureProposal {
    +UUID id
    +UUID jobId
    +int version
    +float score
    +String rationale
    +Blueprint[] blueprints
    +revise(changes)
    +summarize(): String
    +toBlocks(): Blocks
  }

  class Blueprint {
    <<abstract>>
    +String type
    +String name
    +String description
    +Map settings
    +String[] membersSeed
    +Op[] ops
    +UUID[] dependsOn
  }

  class ChannelBlueprint {
  }
  class UserGroupBlueprint {
  }

  class Orchestrator {
    +buildPrompt(IntakeForm,SlackContext,Policy[]): Prompt
    +generateProposal(jobId: UUID): StructureProposal
    +applyProposal(proposalId: UUID): ApplyResult
    +recordAudit(action: String, payload: Map)
  }

  class Evaluator {
    +scoreCoverage(StructureProposal): float
    +detectDuplicates(StructureProposal): Issue[]
    +enforcePolicies(StructureProposal,Policy[]): ValidationResult
    +riskFlags(StructureProposal): Issue[]
  }

  class SlackClient {
    +createChannel(name, isPrivate)
    +setTopic(channelId, topic)
    +createUserGroup(name)
    +updateUserGroup(id, users[])
    +invite(channelId, users[])
    +pin(channelId, fileOrMessage)
  }

  StructureJob --> IntakeForm
  StructureJob --> StructureProposal
  StructureProposal o-- Blueprint
  Blueprint <|-- ChannelBlueprint
  Blueprint <|-- UserGroupBlueprint
  Orchestrator --> SlackClient
  Orchestrator --> Evaluator
  Orchestrator --> Policy
  Orchestrator --> SlackContext
Explanation: The diagram shows persistence models (e.g., StructureJob, StructureProposal) and service classes (e.g., Orchestrator, Evaluator). Blueprints are abstract specifications the apply phase turns into concrete Slack API calls.
**List of Classes (Purpose & Responsibilities)**


StructureJob — Tracks lifecycle of a generation/apply run. Owns status transitions, timestamps, and error handling.


IntakeForm — Captures human requirements that condition the proposal (scope, teams, goals, constraints).


SlackContext — Snapshot of workspace metadata used to ground the model and prevent duplicates.


Policy — Encapsulates rules (naming, privacy defaults, retention). Validates proposals and yields actionable violations.


StructureProposal — Versioned container of one proposed IA; supports revision, summarization, and rendering to modal blocks.


Blueprint — Abstract spec of a resource plus idempotent operations required to create/configure it. Specialized by ChannelBlueprint and UserGroupBlueprint.


Orchestrator — Application core. Sequences steps, builds prompts, persists artifacts, and executes the apply phase with rate limiting.


Evaluator — Quality and safety gate. Scores coverage, finds duplicates, enforces policies, and flags risks for human review.


SlackClient — Thin adapter around Slack Web API with retry/backoff and scope checks.


**State Diagrams**

![ alt text](u1_state.png)

stateDiagram-v2
  [*] --> created
  created --> intake_ready
  intake_ready --> generating
  generating --> review
  review --> approved
  approved --> applying
  applying --> done
  created --> failed
  intake_ready --> failed
  generating --> failed
  review --> failed
  applying --> failed
Explanation (StructureJob): Jobs start at created, become intake_ready once the form is saved, move to generating while the AI runs, reach review for human approval, then applying to create resources, and finally done. Any step can fail with a captured reason and retry policy.


**Development Risks and Failures (Explained)**


Slack API rate limits — Creating many channels/invites may exceed quotas. Mitigation: queue operations, batch invites, exponential backoff, and dry‑run to estimate cost.


Insufficient permissions/scopes — The app might not have rights to read users or create channels. Mitigation: guided installation with explicit scope rationale; degrade gracefully with partial features.


Low‑quality or hallucinated proposals — The model could suggest redundant or non‑compliant channels. Mitigation: strict policy validator, curated exemplars, JSON‑schema constrained outputs, and required human approval.


Enterprise Grid complexity — Cross‑workspace nuances (shared channels, org‑level user groups). Mitigation: v1 targets a single workspace; v2 adds Grid‑aware mapping and admin options.


Security & PII leakage — Prompts may include personal data. Mitigation: optional DLP redaction, field‑level controls, and short retention with auditability.


Change management & user confusion — Sudden channel creation can surprise teams. Mitigation: preview diffs, announcement posts, and rollback (archive newly created resources).


**Technology Stack**


TypeScript (Node.js 20); Bolt for Slack + Fastify; AWS (Lambda/API Gateway, SQS), PostgreSQL + pgvector, Redis, S3; OpenTelemetry; Jest, Pact, Playwright; Terraform; LLM provider (e.g., GPT‑4‑class) with JSON mode.


**APIs**


Incoming Slack
POST /slack/events — Verifies URL, receives app_mention, shortcuts; routes to command handlers.


POST /slack/interactions — Handles modal submissions, button clicks, and view updates.


Internal REST
POST /structure/generate — Body: IntakeForm; Creates StructureJob, returns {jobId}.


GET /structure/jobs/{id} — Returns job, status, current proposal (if any).


POST /structure/proposals/{id}/approve — Applies proposal; returns ApplyResult with created resources.


POST /structure/proposals/{id}/revise — Body: patch ops; returns new version.


POST /structure/proposals/{id}/feedback — Body: {rating:int, comments:string}.


Service Interfaces (Methods)
Orchestrator: createJob(intake), harvestContext(jobId), buildPrompt(jobId), invokeAI(jobId), validate(jobId), renderForReview(jobId), apply(jobId), archive(jobId).


Evaluator: validateNaming(proposal), validatePrivacy(proposal), detectDuplicates(proposal), scoreCoverage(proposal).


SlackClient: createChannel, setTopic, setPurpose, archiveChannel, createUserGroup, updateUserGroupMembers, inviteUsers, pinItem.


**Public Interfaces (Methods & Contracts)**


Slash Command /autostructure


Request: {team_id, user_id, channel_id, text}


Behavior: Opens Intake Modal; creates job upon submit.


Shortcut: “Generate structure from thread”


Request: {message_ts, channel}


Behavior: Seeds intake with thread summary.


Home Tab


Sections: Job status list, “Generate New” button, settings (naming policy, privacy defaults), history with diffs.


Modals


Intake Modal: fields {projectName, teams[], timeline, compliance[]}; submit → view_submission handler onIntakeSubmit().


Proposal Review Modal: dynamic blocks showing each blueprint with toggles (private/public), edit name/topic, approve. Handlers: onProposalEdit(), onApprove().


Confirmation Modal: shows dry‑run diff and estimated API calls; handler: onConfirmApply().


**Data Schemas (Datatypes Included)**

![ alt text](u1_data.png)

erDiagram
    workspaces {
        UUID id PK
        TEXT slack_team_id UK "UNIQUE NOT NULL"
        TEXT installer_user_id "NOT NULL"
        TIMESTAMPTZ created_at "DEFAULT now() NOT NULL"
        JSONB settings "DEFAULT '{}' NOT NULL"
    }
    
    structure_jobs {
        UUID id PK
        UUID workspace_id FK
        TEXT status "CHECK status IN ('created','intake_ready','generating','review','approved','applying','done','failed') NOT NULL"
        TEXT created_by_user_id "NOT NULL"
        TIMESTAMPTZ created_at "DEFAULT now() NOT NULL"
        TIMESTAMPTZ updated_at "DEFAULT now() NOT NULL"
    }
    
    intake_forms {
        UUID id PK
        UUID job_id FK
        JSONB data "NOT NULL"
    }
    
    proposals {
        UUID id PK
        UUID job_id FK
        INT version "NOT NULL"
        NUMERIC score "(3,2)"
        TEXT rationale
        JSONB payload "NOT NULL"
    }
    
    blueprints {
        UUID id PK
        UUID proposal_id FK
        TEXT type "CHECK type IN ('channel','user_group') NOT NULL"
        TEXT name "NOT NULL"
        TEXT description
        JSONB settings "DEFAULT '{}' NOT NULL"
        JSONB members_seed "DEFAULT '[]' NOT NULL"
        JSONB depends_on "DEFAULT '[]' NOT NULL"
    }
    
    policies {
        UUID id PK
        UUID workspace_id FK
        TEXT type "NOT NULL"
        JSONB rules "NOT NULL"
    }
    
    audit_logs {
        UUID id PK
        UUID job_id FK
        TEXT action "NOT NULL"
        JSONB payload "NOT NULL"
        TIMESTAMPTZ created_at "DEFAULT now() NOT NULL"
    }
    
    feedback {
        UUID id PK
        UUID proposal_id FK
        INT rating "CHECK rating BETWEEN 1 AND 5"
        TEXT comments
        TIMESTAMPTZ created_at "DEFAULT now() NOT NULL"
    }
    
    workspaces ||--o{ structure_jobs : "workspace_id"
    structure_jobs ||--o{ intake_forms : "job_id"
    structure_jobs ||--o{ proposals : "job_id"
    structure_jobs ||--o{ audit_logs : "job_id"
    proposals ||--o{ blueprints : "proposal_id"
    proposals ||--o{ feedback : "proposal_id"
    workspaces ||--o{ policies : "workspace_id"

**Security and Privacy (Explained)**


Least‑privilege scopes — Request only what v1 needs (channels:manage, groups:write, users:read, usergroups:write, pins:write, commands, chat:write). This limits blast radius if tokens leak and eases app review.


Data minimization — Store Slack IDs and metadata, not raw PII. When prompts require examples, replace names/emails with role labels. This reduces privacy risk and compliance burden.


Encryption — TLS for all transport; KMS‑managed AES‑256 at rest for PostgreSQL and S3. Secrets (Slack tokens, model keys) live in Secrets Manager, never in env files.


Access controls — Per‑workspace tokens; app operators access through SSO‑protected admin with role‑based permissions. Audit all apply operations.


Retention & deletion — Default retention 30 days for proposals and logs; workspace admins can shorten/extend; hard delete supports right‑to‑erasure.


PII redaction option — Pluggable DLP step masks emails/real names before sending prompts to LLMs hosted outside the workspace region.


Abuse/safety guardrails — Policy engine blocks creation of channels matching restricted keywords (e.g., terms implying sensitive HR/medical topics) unless an admin overrides.


**Risks to Completion (Explained)**


Slack App approval timing — Scopes and distribution review can delay launch. Plan: prepare scope rationale, sample screens, and security notes early; start private beta with non‑distributed app.


Model latency/cost — Generating rich proposals can be slow/expensive. Plan: cache prompts, use smaller models for drafts, and stream partial previews so users aren’t blocked.


Heterogeneous customer policies — Teams have unique naming/visibility conventions. Plan: ship a policy editor and industry templates; make evaluator rules data‑driven.


Testing data scarcity — Few real workspaces available pre‑launch. Plan: synthesize workspaces and maintain a “golden set” to regression‑test proposal quality.


Organizational change resistance — Users may distrust automatic creation. Plan: emphasize preview/diff, provide a one‑click rollback (archive), and include onboarding content and tips.
