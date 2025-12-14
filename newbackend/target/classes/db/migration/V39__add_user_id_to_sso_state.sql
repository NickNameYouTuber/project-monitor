-- Add user_id column to sso_states table
-- This allows tracking which user initiated the SSO login flow
ALTER TABLE sso_states ADD COLUMN user_id UUID;

-- Add index for faster lookups
CREATE INDEX idx_sso_states_user ON sso_states(user_id);

