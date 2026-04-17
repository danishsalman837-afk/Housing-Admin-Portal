-- Create table for snippet folders
CREATE TABLE IF NOT EXISTS snippet_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for snippets
CREATE TABLE IF NOT EXISTS snippets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES snippet_folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrating existing default data (Optional)
INSERT INTO snippet_folders (id, name) VALUES 
('00000000-0000-0000-0000-000000000001', 'Intro / Onboarding'),
('00000000-0000-0000-0000-000000000002', 'Follow-up'),
('00000000-0000-0000-0000-000000000003', 'Legal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO snippets (folder_id, title, content) VALUES 
('00000000-0000-0000-0000-000000000001', 'First Contact', 'Hi {{first_name}}, thanks for reaching out regarding your housing disrepair claim. We have received your inquiry and an agent will be in touch shortly.'),
('00000000-0000-0000-0000-000000000001', 'Welcome Back', 'Hi {{first_name}}, welcome back. How can we help you today?'),
('00000000-0000-0000-0000-000000000002', 'Photo Request', 'Hi {{first_name}}, could you please provide photos of the disrepair issue at your earliest convenience?'),
('00000000-0000-0000-0000-000000000002', 'Status Update', 'Hi {{first_name}}, just a quick update — your claim is progressing well. Your solicitor {{solicitor}} will be in contact soon.'),
('00000000-0000-0000-0000-000000000003', 'Solicitor Assigned', 'Hi {{first_name}}, your claim has been assigned to {{solicitor}}. They will contact you within 24-48 hours to discuss next steps.')
ON CONFLICT DO NOTHING;
