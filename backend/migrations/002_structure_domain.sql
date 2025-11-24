-- Structure Domain (User Story 1)

CREATE TYPE structure_status AS ENUM ('created','proposed','validated','applying','applied','failed');

CREATE TABLE structure_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status structure_status NOT NULL DEFAULT 'created',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE intake_forms (
  job_id UUID PRIMARY KEY REFERENCES structure_jobs(job_id) ON DELETE CASCADE,
  community_size TEXT NOT NULL,
  core_activities TEXT[] NOT NULL,
  moderation_capacity TEXT NOT NULL,
  channel_budget INT NOT NULL,
  additional_context TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE proposals (
  job_id UUID REFERENCES structure_jobs(job_id) ON DELETE CASCADE,
  version INT NOT NULL,
  score NUMERIC(3,2) NOT NULL,
  rationale TEXT,
  proposal JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY(job_id, version)
);

CREATE TABLE blueprints (
  job_id UUID PRIMARY KEY REFERENCES structure_jobs(job_id) ON DELETE CASCADE,
  blueprint JSONB NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_structure_jobs_workspace ON structure_jobs(workspace_id);
CREATE INDEX idx_structure_jobs_status ON structure_jobs(status);
