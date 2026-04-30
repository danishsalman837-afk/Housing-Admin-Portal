const { createClient } = require("@supabase/supabase-js");
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function findLead() {
    console.log("Searching for Michael Proctor...");
    const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .ilike('name', '%Michael%Proctor%');

    if (error) {
        console.error("Search Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} records:`);
        data.forEach(lead => {
            console.log(`- ID: ${lead.id}, Name: ${lead.name}, Phone: [${lead.phone}], Mobile: [${lead.mobile_number}], Created: ${lead.timestamp || lead.created_at}`);
        });
    } else {
        console.log("No record found for Michael Proctor.");
        
        console.log("Checking last 5 submissions...");
        const { data: lastLeads } = await supabase
            .from('submissions')
            .select('id, name, phone, timestamp')
            .order('timestamp', { ascending: false })
            .limit(5);
        
        console.log(JSON.stringify(lastLeads, null, 2));
    }
}

findLead();
