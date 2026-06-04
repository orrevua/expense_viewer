-- Run this in the Supabase SQL Editor
-- Adds user_id column to dashboards so each user has their own dashboards

ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index for fast user-based lookups
CREATE INDEX IF NOT EXISTS idx_dashboards_user_id ON dashboards (user_id);

-- After running this, tie your existing dashboards to your account:
-- 1. Find your user ID:
--    SELECT id, name, email FROM users;
-- 2. Update your existing dashboards:
--    UPDATE dashboards SET user_id = 'YOUR-USER-ID-HERE' WHERE user_id IS NULL;
