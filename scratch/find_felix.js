
const { createSupabaseClient } = require("../api/_supabaseClient");

async function findFelix() {
    const supabase = createSupabaseClient('service');
    const { data, error } = await supabase.from('companies').select('id, name').ilike('name', '%felix%');
    console.log("Felix Companies:", data);
}

findFelix().catch(console.error);
