-- Add invite code functionality to workspaces
ALTER TABLE workspaces
ADD COLUMN invite_code VARCHAR(12) UNIQUE;

-- Generate invite codes for existing workspaces
UPDATE workspaces 
SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL after populating existing rows
ALTER TABLE workspaces
ALTER COLUMN invite_code SET NOT NULL;

-- Add index for faster invite code lookups
CREATE INDEX idx_workspaces_invite_code ON workspaces(invite_code);

-- Add invited_by column to workspace_members to track who invited whom
ALTER TABLE workspace_members
ADD COLUMN invited_by UUID REFERENCES users(id);
