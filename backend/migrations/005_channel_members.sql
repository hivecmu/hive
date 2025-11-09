-- Channel Members Table
-- This table tracks which users are members of which channels
-- Required for proper channel visibility and permissions

CREATE TABLE channel_members (
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (channel_id, user_id)
);

-- Index for performance
CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);

-- Auto-add all workspace members to non-private channels created in the future
-- This is a helper function for maintaining consistency
CREATE OR REPLACE FUNCTION auto_add_members_to_public_channel()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-add members if the channel is not private
  IF NEW.is_private = false THEN
    -- Add all workspace members to this channel
    INSERT INTO channel_members (channel_id, user_id)
    SELECT NEW.id, user_id
    FROM workspace_members
    WHERE workspace_id = NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add members when a public channel is created
CREATE TRIGGER trigger_auto_add_members_to_public_channel
AFTER INSERT ON channels
FOR EACH ROW
WHEN (NEW.is_private = false)
EXECUTE FUNCTION auto_add_members_to_public_channel();
