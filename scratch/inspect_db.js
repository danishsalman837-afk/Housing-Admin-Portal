const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // Assuming .env is in the project root

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Columns:", Object.keys(data[0] || {}));
    console.log("Sample Lead:", data[0]);
  }
}

inspect();
