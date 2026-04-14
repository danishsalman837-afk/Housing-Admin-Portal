const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFelix() {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .ilike('name', '%felix%');
    
    if (error) {
        console.error('Error fetching company:', error);
        return;
    }
    
    console.log('Felix Legal records found:', data.length);
    data.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name}`);
        console.log(`SMTP Host: ${c.smtp_host}`);
        console.log(`SMTP User: ${c.smtp_user}`);
        console.log(`SMTP Pass: ${c.smtp_pass ? (c.smtp_pass.length + ' characters') : 'Not set'}`);
        if (c.smtp_pass && c.smtp_pass.length === 15) {
            console.log('⚠️ WARNING: Password is 15 characters. It should likely be 16.');
        }
    });
}

checkFelix();
