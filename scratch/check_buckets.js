const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Try to load from Vercel env or local
// Since I'm running on the user's machine, I might not have the env vars unless they are in a .env file
// But I can check if they are set in the environment

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkBuckets() {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets:", error);
        return;
    }
    console.log("Buckets found:", data.map(b => b.name));
}

checkBuckets();
