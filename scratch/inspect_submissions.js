const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function inspect() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        return;
    }
    const supabase = createClient(url, key);
    
    console.log("Fetching last 5 submissions...");
    const { data, error } = await supabase
        .from('submissions')
        .select('id, name, phone, leadStatus, is_submitted, timestamp, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (error) {
        console.error("Error:", error.message);
        return;
    }
    
    console.log("Recent Submissions:");
    data.forEach(s => {
        console.log(`- ID: ${s.id}, Name: ${s.name}, Phone: ${s.phone}, Status: ${s.leadStatus}, Submitted: ${s.is_submitted}, Timestamp: ${s.timestamp}`);
    });
}

inspect();
