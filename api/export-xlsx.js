const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const xlsx = require("xlsx");

/**
 * Robust Export Engine
 * Rule: ONLY query records where is_submitted = true.
 * Support: Dynamic filtering by lead_stage.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { stage, allSubmitted } = req.query;

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    // MANDATORY RULE: is_submitted must be true
    // Exclusion: Drafts are is_submitted = false
    let query = supabase.from('submissions')
      .select('*')
      .eq('is_submitted', true)
      .order('timestamp', { ascending: false });

    // Filter by specific stage if provided and not "All Submitted" mode
    if (stage && stage !== 'All' && !allSubmitted) {
      query = query.eq('lead_stage', stage);
    }

    const { data: leads, error } = await query;
    if (error || !leads) return res.status(500).json({ error: "Failed to fetch leads" });

    // Map objects for Excel
    const formattedData = leads.map(lead => {
      const row = {
        ID: lead.id,
        Date: lead.timestamp ? new Date(lead.timestamp).toLocaleDateString() : '---',
        "Lead Name": lead.name,
        "Phone Number": lead.phone,
        "Email Address": lead.email,
        "Lead Stage": lead.lead_stage || lead.leadStatus || 'New Lead',
        "Submission Status": "Submitted",
        "Assigned Company ID": lead.assigned_company_id,
      };

      // Inject all other fields that aren't the basic ones
      Object.keys(lead).forEach(k => {
        if (!['id', 'timestamp', 'name', 'phone', 'email', 'leadStatus', 'lead_stage', 'is_submitted', 'assigned_company_id'].includes(k)) {
          row[k] = lead[k];
        }
      });

      return row;
    });

    const worksheet = xlsx.utils.json_to_sheet(formattedData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Submitted Leads");

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Filename convention: Submitted_Leads_[StageName]_[Date].xlsx
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = allSubmitted 
      ? `All_Submitted_Leads_${dateStr}.xlsx` 
      : `Submitted_Leads_${(stage || 'Filtered').replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.end(buffer);

  } catch (err) {
    console.error("Export Error:", err);
    return res.status(500).json({ error: "Server error generating Excel export" });
  }
};
