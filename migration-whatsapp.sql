-- Enable the UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the whatsapp_messages table to store chat history
-- Fixed lead_id type to match submissions(id) which is INTEGER
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    sender_phone TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    whatsapp_message_id TEXT UNIQUE, -- Meta's internal message ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by lead_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_lead_id ON whatsapp_messages(lead_id);

-- Enable Realtime for message updates
ALTER TABLE whatsapp_messages REPLICA IDENTITY FULL;
-- Note: You may need to enable realtime through the Supabase dashboard (Database -> Replication)
