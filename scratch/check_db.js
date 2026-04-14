
const { createSupabaseClient } = require("../api/_supabaseClient");

async function check() {
    const supabase = createSupabaseClient('service');
    
    console.log("--- COMPANIES ---");
    const { data: companies } = await supabase.from('companies').select('*');
    companies.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name || c.company_name}, SMTP User: ${c.smtp_user}`);
    });

    console.log("\n--- MEMBERS ---");
    const { data: members } = await supabase.from('company_members').select('*');
    members.forEach(m => {
        console.log(`ID: ${m.id}, Name: ${m.first_name} ${m.last_name}, Company ID: ${m.company_id}, Email: ${m.email}`);
    });
}

check().catch(console.error);
