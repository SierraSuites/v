-- =====================================================
-- Module 17: Real-time Collaboration
-- Features: Team chat, presence, notifications
-- Date: 2026-03-17
-- =====================================================

-- =====================================================
-- 1. CHAT CHANNELS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  channel_type VARCHAR(20) NOT NULL DEFAULT 'public', -- public, private, direct, project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),

  CONSTRAINT valid_channel_type CHECK (channel_type IN ('public', 'private', 'direct', 'project'))
);

-- Indexes for chat_channels
CREATE INDEX idx_chat_channels_company ON chat_channels(company_id);
CREATE INDEX idx_chat_channels_project ON chat_channels(project_id);
CREATE INDEX idx_chat_channels_type ON chat_channels(channel_type);
CREATE INDEX idx_chat_channels_archived ON chat_channels(archived_at) WHERE archived_at IS NULL;

-- =====================================================
-- 2. CHANNEL MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  notification_preference VARCHAR(20) NOT NULL DEFAULT 'all', -- all, mentions, none

  CONSTRAINT valid_member_role CHECK (role IN ('admin', 'member')),
  CONSTRAINT valid_notification_preference CHECK (notification_preference IN ('all', 'mentions', 'none')),
  UNIQUE(channel_id, user_id)
);

-- Indexes for channel_members
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, file, system, mention
  parent_message_id UUID REFERENCES chat_messages(id), -- For threading
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- File attachment metadata
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),

  -- Mentions
  mentioned_users UUID[],

  CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'file', 'system', 'mention'))
);

-- Indexes for chat_messages
CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id);
CREATE INDEX idx_chat_messages_deleted ON chat_messages(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for mentioned users array
CREATE INDEX idx_chat_messages_mentions ON chat_messages USING GIN (mentioned_users);

-- =====================================================
-- 4. MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(message_id, user_id, emoji)
);

-- Indexes for message_reactions
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- =====================================================
-- 5. USER PRESENCE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- online, away, busy, offline
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_page VARCHAR(255),

  CONSTRAINT valid_presence_status CHECK (status IN ('online', 'away', 'busy', 'offline'))
);

-- Index for presence queries
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  notification_type VARCHAR(50) NOT NULL, -- message, mention, task_assigned, etc.
  title VARCHAR(255) NOT NULL,
  content TEXT,

  -- Reference to the entity that triggered the notification
  entity_type VARCHAR(50), -- message, task, project, invoice, etc.
  entity_id UUID,

  -- Link to navigate when clicked
  action_url VARCHAR(500),

  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Priority
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent

  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- =====================================================
-- 7. TYPING INDICATORS TABLE (for real-time)
-- =====================================================
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 seconds',

  UNIQUE(channel_id, user_id)
);

-- Index for typing indicators
CREATE INDEX idx_typing_indicators_channel ON typing_indicators(channel_id, expires_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: Chat Channels
-- =====================================================

-- Users can view channels they are members of
CREATE POLICY "Users can view their channels"
  ON chat_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_channels.id
      AND channel_members.user_id = auth.uid()
    )
    OR channel_type = 'public'
  );

-- Users can create channels in their company
CREATE POLICY "Users can create channels"
  ON chat_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = chat_channels.company_id
    )
  );

-- Channel admins can update channels
CREATE POLICY "Channel admins can update"
  ON chat_channels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_channels.id
      AND channel_members.user_id = auth.uid()
      AND channel_members.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES: Channel Members
-- =====================================================

-- Users can view members of channels they belong to
CREATE POLICY "Users can view channel members"
  ON channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_members cm
      WHERE cm.channel_id = channel_members.channel_id
      AND cm.user_id = auth.uid()
    )
  );

-- Channel admins can add members
CREATE POLICY "Channel admins can add members"
  ON channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = channel_members.channel_id
      AND channel_members.user_id = auth.uid()
      AND channel_members.role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES: Chat Messages
-- =====================================================

-- Users can view messages in channels they belong to
CREATE POLICY "Users can view channel messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );

-- Users can send messages to channels they belong to
CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_members.channel_id = chat_messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own messages
CREATE POLICY "Users can edit their messages"
  ON chat_messages FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: Notifications
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can mark their notifications as read
CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES: User Presence
-- =====================================================

-- Users can view presence of users in their company
CREATE POLICY "Users can view company presence"
  ON user_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2
      WHERE p1.id = auth.uid()
      AND p2.id = user_presence.user_id
      AND p1.company_id = p2.company_id
    )
  );

-- Users can update their own presence
CREATE POLICY "Users can update their presence"
  ON user_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can modify their presence"
  ON user_presence FOR UPDATE
  USING (user_id = auth.uid());

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_channel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_last_read_at TIMESTAMPTZ;
BEGIN
  -- Get user's last read timestamp for the channel
  SELECT last_read_at INTO v_last_read_at
  FROM channel_members
  WHERE user_id = p_user_id AND channel_id = p_channel_id;

  -- Count messages after last read
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM chat_messages
  WHERE channel_id = p_channel_id
  AND deleted_at IS NULL
  AND created_at > COALESCE(v_last_read_at, '1970-01-01'::TIMESTAMPTZ);

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_user_id UUID, p_channel_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE channel_members
  SET last_read_at = NOW()
  WHERE user_id = p_user_id AND channel_id = p_channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_company_id UUID,
  p_notification_type VARCHAR,
  p_title VARCHAR,
  p_content TEXT,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_action_url VARCHAR,
  p_priority VARCHAR DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    company_id,
    notification_type,
    title,
    content,
    entity_type,
    entity_id,
    action_url,
    priority
  ) VALUES (
    p_user_id,
    p_company_id,
    p_notification_type,
    p_title,
    p_content,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_priority
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS VOID AS $$
BEGIN
  DELETE FROM typing_indicators
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update chat_channels.updated_at
CREATE OR REPLACE FUNCTION update_channel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_channel_timestamp
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_channel_timestamp();

-- Trigger to create notification when user is mentioned
CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioned_user UUID;
  v_company_id UUID;
  v_channel_name VARCHAR;
BEGIN
  -- Get company_id and channel name
  SELECT c.company_id, c.name INTO v_company_id, v_channel_name
  FROM chat_channels c
  WHERE c.id = NEW.channel_id;

  -- Create notification for each mentioned user
  IF NEW.mentioned_users IS NOT NULL THEN
    FOREACH v_mentioned_user IN ARRAY NEW.mentioned_users
    LOOP
      PERFORM create_notification(
        v_mentioned_user,
        v_company_id,
        'mention',
        'You were mentioned',
        'You were mentioned in #' || v_channel_name,
        'message',
        NEW.id,
        '/chat?channel=' || NEW.channel_id || '&message=' || NEW.id,
        'normal'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_mentioned_users
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

-- Enable realtime for chat_messages (most critical)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =====================================================
-- SEED DATA: Create default channels
-- =====================================================

-- Note: Default channels should be created per company on company creation
-- This is a template for what could be created

-- Example: General channel for first company (if needed)
-- INSERT INTO chat_channels (company_id, name, description, channel_type, created_by)
-- SELECT
--   id,
--   'general',
--   'General discussion for the whole team',
--   'public',
--   (SELECT id FROM auth.users LIMIT 1)
-- FROM companies
-- LIMIT 1;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
