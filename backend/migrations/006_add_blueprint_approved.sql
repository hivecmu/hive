-- Add blueprint_approved column to workspaces
ALTER TABLE workspaces
ADD COLUMN blueprint_approved BOOLEAN DEFAULT false NOT NULL;

