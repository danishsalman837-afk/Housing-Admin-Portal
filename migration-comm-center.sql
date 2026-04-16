-- Create communication_logs table to store message and call history
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'SMS' or 'CALL'
    direction TEXT NOT NULL, -- 'outbound' or 'inbound'
    content TEXT, -- Message body for SMS or call recording URL/notes
    duration INTEGER, -- Duration in seconds for calls
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'missed', 'completed', etc.
    metadata JSONB, -- Additional provider-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sms_templates table for pre-written messages
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial templates
INSERT INTO sms_templates (name, category, content) 
VALUES 
('WhatsApp Invite', 'Invite', 'Hi {{name}}, I am calling from Housing Standards. Please save our number and message us on WhatsApp here: https://wa.me/YOUR_NUMBER'),
('Lead Introduction', 'Intro', 'Hello {{name}}, this is Housing Standards Admin. We have received your inquiry and will contact you shortly.'),
('Information Request', 'Follow-up', 'Hi {{name}}, we need a few more details to proceed with your claim. Could you please provide your property address?');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comm_logs_lead_id ON communication_logs(lead_id);
