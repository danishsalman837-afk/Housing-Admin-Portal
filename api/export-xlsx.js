const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const xlsx = require("xlsx");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { status, company } = req.query;

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    let query = supabase.from('submissions').select('*').order('timestamp', { ascending: false });

    // Apply Filter server side if requested
    if (status && status !== 'All') {
      query = query.eq('leadStatus', status);
    }
    if (company && company !== 'All') {
      query = query.eq('assigned_company_id', company);
    }

    const { data: leads, error } = await query;
    if (error || !leads) return res.status(500).json({ error: "Failed to fetch leads" });

    // Map objects
    const formattedData = leads.map(lead => {
        const row = {
            ID: lead.id,
            Date: lead.timestamp ? new Date(lead.timestamp).toLocaleDateString() : '---',
            Name: lead.name,
            Phone: lead.phone,
            Email: lead.email,
            Status: lead.leadStatus,
            "Assigned Company ID": lead.assigned_company_id,
        };

        // Inject all other fields that aren't the basic ones
        Object.keys(lead).forEach(k => {
            if(!['id', 'timestamp', 'name', 'phone', 'email', 'leadStatus', 'assigned_company_id'].includes(k)) {
                row[k] = lead[k];
            }
        });

        return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Leads Data");

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="Exported_Leads_${new Date().getTime()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.end(buffer);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error generating Excel" });
  }
};
