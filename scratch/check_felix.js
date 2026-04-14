const { createClient } = require("@supabase/supabase-js");
require('dotenv').config();

async function checkFelix() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', '%felix%');
  
  if (error) {
    console.error("Error fetching companies:", error);
    return;
  }
  
  console.log("Felix Companies found:", data.length);
  data.forEach(c => {
    console.log(`ID: ${c.id}, Name: ${c.name}`);
    console.log(`SMTP Host: ${c.smtp_host}`);
    console.log(`SMTP User: ${c.smtp_user}`);
    console.log(`SMTP Pass: ${c.smtp_pass ? '***' : 'none'}`);
    console.log(`SMTP Port: ${c.smtp_port}`);
    console.log(`SMTP Secure: ${c.smtp_secure}`);
  });
}

checkFelix();
