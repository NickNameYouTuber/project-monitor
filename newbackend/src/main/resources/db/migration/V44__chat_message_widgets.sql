-- Add widgets column to chat_messages table for storing clarification widgets
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS widgets JSONB;
