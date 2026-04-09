const { createSupabaseClient, assertEnv } = require("./api/_supabaseClient");

async function checkTable() {
    try {
        const supabase = createSupabaseClient('service');
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error("Error accessing 'profiles' table:", error.message);
        } else {
            console.log("'profiles' table exists. Sample data:", data);
        }

        const { data: cols, error: colError } = await supabase
            .rpc('get_table_info', { table_name: 'profiles' });
        // RPC might not exist, but let's try a simple query first.
    } catch (err) {
        console.error("Execution error:", err);
    }
}

checkTable();
