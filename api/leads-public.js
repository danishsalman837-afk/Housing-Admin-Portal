const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  
  const method = req.method;
  const route = req.query.route || req.body.route;

  // ═════════════════════════════════════════════════
  // DIAGNOSTIC PING
  // ═════════════════════════════════════════════════
  if (method === 'GET' && route === 'ping') {
      const url = process.env.SUPABASE_URL || 'NOT_SET';
      const projectId = url.split('.')[0].split('//')[1] || 'UNKNOWN';
      const { data: cols } = await supabase.from('submissions').select('*').limit(1);
      return res.status(200).json({ status: "online", projectId, columns: cols ? Object.keys(cols[0]) : [] });
  }

  const isDraft = route === 'draft' || req.url.includes('save-draft') || req.body.isDraft === true;
  const data = (req.method === 'POST') ? req.body : req.query;

  if (Object.keys(data).length === 0) return res.status(400).json({ error: "No data received." });

  try {
    // Basic mapping to ensure form fields reach DB columns
    const mapping = {
        dateOfBirth: 'dob', tenancyDuration: 'livingDuration', hasDampMould: 'damp', roomsAffected: 'dampRooms',
        reportedOverMonth: 'reported', rentalArrears: 'arrears', agentName: 'agentName', 
        tenancyOnName: 'tenancyOnName', tenancyType: 'tenancyType', isNameOnJoint: 'isNameOnJoint',
        propertyType: 'propertyType'
    };

    const originalRawData = JSON.parse(JSON.stringify(data));
    const rawPhone = data.phone || data.mobileNumber || data.mobile_number;
    const rawAgentName = data.agentName || data.agent_name;

    for (const [formKey, dbKey] of Object.entries(mapping)) {
        if (data[formKey] !== undefined) data[dbKey] = data[formKey];
    }

    // Prepare "Safe" values for both old and new columns
    data.timestamp = new Date().toISOString();
    data.isSubmitted = !isDraft;
    data.is_submitted = !isDraft; // Legacy support
    data.leadStatus = isDraft ? 'Agent Saved' : 'New Lead';
    data.leadStage = isDraft ? 'Draft' : 'New Lead';
    data.lead_stage = isDraft ? 'Draft' : 'New Lead'; // Legacy support
    data.agentName = rawAgentName;
    data.agent_name = rawAgentName; // Legacy support
    data.agentData = originalRawData;
    data.agent_data = originalRawData; // Legacy support

    if (!rawPhone) return res.status(400).json({ error: "Phone number required." });

    // Search existing
    const strippedPhone = rawPhone.replace(/\D/g, '');
    const { data: existing } = await supabase
        .from('submissions')
        .select('id, leadStatus, agentData')
        .or(`phone.eq.${rawPhone},phone.eq.${strippedPhone},mobileNumber.eq.${strippedPhone}`)
        .limit(1);

    const existingLead = (existing && existing.length > 0) ? existing[0] : null;

    if (existingLead) {
        // Update existing lead
        const { data: updated, error: updErr } = await supabase.from('submissions').update(data).eq('id', existingLead.id).select();
        if (updErr) throw updErr;
        return res.status(200).json({ success: true, lead: updated[0] });
    } else {
        // Insert new lead
        if (!data.uniqueToken) data.uniqueToken = crypto.randomUUID();
        const { data: inserted, error: insErr } = await supabase.from('submissions').insert([data]).select();
        if (insErr) throw insErr;
        return res.status(200).json({ success: true, lead: inserted[0] });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
