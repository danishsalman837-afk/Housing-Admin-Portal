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
        agentName: 'agent_name', name: 'name', phone: 'phone',
        tenancy_on_name: 'tenancy_on_name', tenancy_type: 'tenancy_type', is_name_on_joint: 'is_name_on_joint', 
        other_tenant_name: 'other_tenant_name', actual_tenant_fullname: 'actual_tenant_fullname',
        infestation: 'infestation',
        property_type: 'property_type'
    };

    // Whitelist of valid DB columns to prevent "column does not exist" errors
    const validColumns = [
        'id', 'name', 'phone', 'email', 'address', 'postcode', 'dob', 'livingDuration', 'tenantType', 'landlordName',
        'damp', 'dampLocation', 'dampRooms', 'dampSurface', 'dampDuration', 'dampCause', 'dampDamage', 'dampHealth',
        'leak', 'leakLocation', 'leakSource', 'leakStart', 'leakDamage', 'leakBelongings', 'leakCracks',
        'issues_electrics', 'issues_heating', 'issues_structural', 'infestation', 'reported', 'reportCount',
        'reportFirst', 'reportLast', 'reportResponse', 'reportAttempt', 'reportStatus', 'arrears', 'arrearsAmount',
        'alreadySubmitted', 'additionalNotes', 'agent_name', 'timestamp', 'is_submitted', 'leadStatus', 'lead_stage',
        'agent_data', 'unique_token', 'property_type', 'tenancy_on_name', 'tenancy_type', 'is_name_on_joint',
        'other_tenant_name', 'actual_tenant_fullname', 'assigned_company_id', 'assigned_solicitor_id', 'mobile_number'
    ];
    
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

    // Filter data to only valid columns
    for (const key of Object.keys(data)) {
        if (!validColumns.includes(key)) {
            delete data[key];
        }
    }

    data.timestamp = new Date().toISOString();
    if (!rawPhone) return res.status(400).json({ error: "Phone number is required." });

    // 2. Find existing lead by phone (Robust searching with variations and multiple columns)
    const strippedPhone = rawPhone.replace(/\D/g, '');
    let variations = [rawPhone, strippedPhone];
    if (strippedPhone.startsWith('44') && strippedPhone.length > 2) {
        variations.push('0' + strippedPhone.substring(2));
        variations.push(strippedPhone.substring(2));
    } else if (strippedPhone.startsWith('0') && strippedPhone.length > 1) {
        variations.push('44' + strippedPhone.substring(1));
        variations.push(strippedPhone.substring(1));
    } else if (strippedPhone.length >= 10) {
        variations.push('0' + strippedPhone);
        variations.push('44' + strippedPhone);
    }
    const uniqueVariations = [...new Set(variations.filter(v => v))];
    // Search in both 'phone' and 'mobile_number' columns.
    // Note: PostgREST .or() filter values should generally not be quoted unless they contain commas.
    const orQuery = uniqueVariations.flatMap(v => [`phone.eq.${v}`, `mobile_number.eq.${v}`]).join(',');

    const { data: existing, error: findError } = await supabase
        .from('submissions')
        .select('id, leadStatus, agent_data, agent_name, phone, mobile_number')
        .or(orQuery)
        .order('timestamp', { ascending: false })
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
           safeUpdate.is_submitted = false;
           safeUpdate.lead_stage = 'Draft';
        } else {
           const currentStatus = (existingLead.leadStatus || '').trim();
           // Reset to 'New Lead' if it was archived, closed, rejected, or a draft
           const hiddenStatuses = ['Archived', 'Closed', 'Rejected', 'Agent Saved', ''];
           if (hiddenStatuses.includes(currentStatus)) {
              safeUpdate.leadStatus = 'New Lead';
              safeUpdate.lead_stage = 'New Lead';
           } else {
              safeUpdate.lead_stage = currentStatus || 'New Lead';
              // Note: we don't set leadStatus here to preserve existing non-hidden status (e.g. Allocated)
           }
           safeUpdate.is_submitted = true;
        }

        const { data: updated, error: updErr } = await supabase.from('submissions').update(safeUpdate).eq('id', existingLead.id).select();
        if (updErr) throw updErr;
        return res.status(200).json({ success: true, message: "Lead updated", lead: updated[0] });
    } else {
        // Insert
        data.is_submitted = !isDraft;
        data.leadStatus = isDraft ? 'Agent Saved' : 'New Lead';
        data.lead_stage = isDraft ? 'Draft' : 'New Lead';
        
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
    return res.status(500).json({ error: "Failed to process submission: " + err.message });
  }
};
