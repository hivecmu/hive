-- Orchestrator (simplified workflow engine)

CREATE TYPE workflow_status AS ENUM ('pending','running','succeeded','failed');

CREATE TABLE workflow_ledger (
  workflow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  correlation_key TEXT,
  payload JSONB,
  error JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  workflow_id UUID REFERENCES workflow_ledger(workflow_id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours') NOT NULL,
  PRIMARY KEY (scope, key)
);

-- Policy & Guardrails

CREATE TYPE policy_rule_kind AS ENUM ('naming','privacy','retention','restricted_terms','membership','classification');
CREATE TYPE policy_severity AS ENUM ('info','warn','error','block');

CREATE TABLE policies (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  version INT NOT NULL,
  published_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  notes TEXT,
  PRIMARY KEY (workspace_id, version)
);

CREATE TABLE policy_rules (
  workspace_id UUID REFERENCES workspaces(id),
  version INT NOT NULL,
  rule_id TEXT NOT NULL,
  kind policy_rule_kind NOT NULL,
  severity policy_severity NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (workspace_id, version, rule_id),
  FOREIGN KEY (workspace_id, version) REFERENCES policies(workspace_id, version) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_status ON workflow_ledger(status);
CREATE INDEX idx_workflow_correlation ON workflow_ledger(correlation_key) WHERE correlation_key IS NOT NULL;
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);
CREATE INDEX idx_policy_rules_enabled ON policy_rules(workspace_id, version) WHERE enabled = true;
