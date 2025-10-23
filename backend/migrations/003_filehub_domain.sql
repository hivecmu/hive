-- File Hub Domain (User Story 2)

CREATE TYPE file_job_status AS ENUM ('created','harvested','deduplicated','indexed','failed');

CREATE TABLE file_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  status file_job_status NOT NULL DEFAULT 'created',
  stats JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE file_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unlinked',
  credentials JSONB,
  last_sync TIMESTAMPTZ,
  files_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE files (
  file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id UUID REFERENCES file_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  url TEXT,
  channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
  content_hash TEXT,
  tags TEXT[],
  is_duplicate BOOLEAN DEFAULT false,
  indexed BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE file_index (
  file_id UUID PRIMARY KEY REFERENCES files(file_id) ON DELETE CASCADE,
  embedding vector(768),
  terms tsvector,
  facets JSONB,
  indexed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_files_hash ON files(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_file_index_terms ON file_index USING GIN(terms);
CREATE INDEX idx_file_jobs_workspace ON file_jobs(workspace_id);
CREATE INDEX idx_file_jobs_status ON file_jobs(status);
