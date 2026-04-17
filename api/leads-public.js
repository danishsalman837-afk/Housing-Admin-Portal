const { createSupabaseClient, assertEnv } = require("./_supabaseClient");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  
  // Detect if it's a "draft" vs full "submit"
  // If the path includes 'save-draft' or explicitly marked
  const route = req.query.route || req.body.route;
  const isDraft = route === 'draft' || req.url.includes('save-draft') || req.body.isDraft === true;
  const data = (req.method === 'POST') ? req.body : req.query;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No data received." });
  }

  try {
    // 1. Normalize
    const mapping = {
        dateOfBirth: 'dob', tenancyDuration: 'livingDuration', hasDampMould: 'damp', roomsAffected: 'dampRooms',
        affectedSurface: 'dampSurface', issueDuration: 'dampDuration', issueCause: 'dampCause', damageBelongings: 'dampDamage',
        healthProblems: 'dampHealth', hasLeaks: 'leak', cracksDamage: 'leakCracks', faultyElectrics: 'issues_electrics',
        heatingIssues: 'issues_heating', structuralDamage: 'issues_structural', reportedOverMonth: 'reported',
        rentalArrears: 'arrears', dampLocation: 'dampLocation', leakLocation: 'leakLocation', leakSource: 'leakSource',
        leakStart: 'leakStart', leakDamage: 'leakDamage', leakBelongings: 'leakBelongings', reportCount: 'reportCount',
        reportFirst: 'reportFirst', reportLast: 'reportLast', reportResponse: 'reportResponse', reportAttempt: 'reportAttempt',
        reportStatus: 'reportStatus', arrearsAmount: 'arrearsAmount', alreadySubmitted: 'alreadySubmitted', additionalNotes: 'additionalNotes',
        agentName: 'agent_name', name: 'name', phone: 'phone'
    };
    
    // Save a DEEP CLONE of the original raw data for the agent_data backup
    const originalRawData = JSON.parse(JSON.stringify(data));
    
    const rawPhone = data.phone || data.mobile_number;
    const rawAgentName = data.agentName || data.agent_name;

    for (const [formKey, dbKey] of Object.entries(mapping)) {
        if (data[formKey] !== undefined) {
            data[dbKey] = data[formKey];
            if (formKey !== dbKey) delete data[formKey];
        }
    }

    data.timestamp = new Date().toISOString();
    if (!rawPhone) return res.status(400).json({ error: "Phone number is required." });

    // 2. Find existing lead by phone (checking both potential DB columns)
    const phoneToSearch = rawPhone;
    const { data: existing, error: findError } = await supabase
        .from('submissions')
        .select('id, leadStatus, agent_data, agent_name')
        .or(`mobile_number.eq."${phoneToSearch}",phone.eq."${phoneToSearch}"`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (findError) return res.status(500).json({ error: findError.message });
    const existingLead = (existing && existing.length > 0) ? existing[0] : null;

    if (existingLead) {
        // Update
        const safeUpdate = {};
        for (const [key, val] of Object.entries(data)) {
            if (val !== null && val !== undefined) {
                safeUpdate[key] = val;
            }
        }
        
        // Ensure agent_name is included in the update if we have it
        if (rawAgentName) {
            safeUpdate.agent_name = rawAgentName;
        } else if (existingLead.agent_name && !safeUpdate.agent_name) {
            safeUpdate.agent_name = existingLead.agent_name;
        }
        
        // Backup original data if not already backed up
        if (!existingLead.agent_data) {
            safeUpdate.agent_data = originalRawData;
        }
        
        if (isDraft) {
           delete safeUpdate.leadStatus; // Don't reset status on draft save
        } else if (!existingLead.leadStatus || existingLead.leadStatus === 'Agent Saved') {
           safeUpdate.leadStatus = 'New Lead';
        }

        const { data: updated, error: updErr } = await supabase.from('submissions').update(safeUpdate).eq('id', existingLead.id).select();
        if (updErr) throw updErr;
        return res.status(200).json({ success: true, message: "Lead updated", lead: updated[0] });
    } else {
        // Insert
        data.leadStatus = isDraft ? 'Agent Saved' : 'New Lead';
        if (!data.unique_token) data.unique_token = crypto.randomUUID();
        if (!data.actual_status) data.actual_status = 'New';
        
        // Save initial submission as agent_data backup
        data.agent_data = originalRawData;

        const { data: inserted, error: insErr } = await supabase.from('submissions').insert([data]).select();
        if (insErr) throw insErr;
        return res.status(200).json({ success: true, message: "Lead captured", lead: inserted[0] });
    }

  } catch (err) {
    console.error("Leads Public Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
