require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Searching for Michael Proctor...");
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .ilike('name', '%Michael%Proctor%');
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Records found:", data ? data.length : 0);
  if (data && data.length > 0) {
    data.forEach(lead => {
        console.log(`- ID: ${lead.id}, Name: ${lead.name}, Phone: [${lead.phone}], Status: ${lead.leadStatus}, Timestamp: ${lead.timestamp}`);
    });
  } else {
    console.log("Checking last 5 submissions in submissions table...");
    const { data: lastLeads } = await supabase
        .from('submissions')
        .select('id, name, phone, timestamp, leadStatus')
        .order('timestamp', { ascending: false })
        .limit(5);
    console.log(JSON.stringify(lastLeads, null, 2));
  }
}

test();
