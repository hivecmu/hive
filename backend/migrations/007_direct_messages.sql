-- Drop the old direct_messages table from migration 001 (different schema)
DROP TABLE IF EXISTS direct_messages CASCADE;

-- Direct message threads between users
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_content TEXT,
  unread_count1 INTEGER DEFAULT 0,
  unread_count2 INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure users are ordered consistently and no duplicates
  CONSTRAINT dm_users_check CHECK (user1_id < user2_id),
  UNIQUE(workspace_id, user1_id, user2_id)
);

-- Direct message conversations
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(dm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_workspace ON direct_messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_user1 ON direct_messages(user1_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_user2 ON direct_messages(user2_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_last_message ON direct_messages(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_recipient ON dm_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_unread ON dm_messages(recipient_id, read_at) WHERE read_at IS NULL;