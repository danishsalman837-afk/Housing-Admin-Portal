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
      
      const { data: cols, error: metaErr } = await supabase.from('submissions').select('*').limit(0);
      const availableColumns = !metaErr ? Object.keys(cols[0] || {}) : [];

      return res.status(200).json({ 
          status: "online", 
          projectId: projectId,
          urlMasked: url.substring(0, 12) + "...",
          columns: availableColumns
      });
  }

  // Detect if it's a "draft" vs full "submit"
  const isDraft = route === 'draft' || req.url.includes('save-draft') || req.body.isDraft === true;
  const data = (req.method === 'POST') ? req.body : req.query;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No data received." });
  }

  try {
    // Mapping: Form Key -> DB Key (Matching your CamelCase SQL schema)
    const mapping = {
        dateOfBirth: 'dob', 
        tenancyDuration: 'livingDuration', 
        hasDampMould: 'damp', 
        roomsAffected: 'dampRooms',
        affectedSurface: 'dampSurface', 
        issueDuration: 'dampDuration', 
        issueCause: 'dampCause', 
        damageBelongings: 'dampDamage',
        healthProblems: 'dampHealth', 
        hasLeaks: 'leak', 
        cracksDamage: 'leakCracks', 
        faultyElectrics: 'issuesElectrics',
        heatingIssues: 'issuesHeating', 
        structuralDamage: 'issuesStructural', 
        reportedOverMonth: 'reported',
        rentalArrears: 'arrears', 
        dampLocation: 'dampLocation', 
        leakLocation: 'leakLocation', 
        leakSource: 'leakSource',
        leakStart: 'leakStart', 
        leakDamage: 'leakDamage', 
        leakBelongings: 'leakBelongings', 
        reportCount: 'reportCount',
        reportFirst: 'reportFirst', 
        reportLast: 'reportLast', 
        reportResponse: 'reportResponse', 
        reportAttempt: 'reportAttempt', 
        reportStatus: 'reportStatus',
        arrearsAmount: 'arrearsAmount', 
        alreadySubmitted: 'alreadySubmitted', 
        additionalNotes: 'additionalNotes', 
        agentName: 'agentName', 
        name: 'name', 
        phone: 'phone',
        tenancyOnName: 'tenancyOnName', 
        tenancyType: 'tenancyType', 
        isNameOnJoint: 'isNameOnJoint', 
        otherTenantName: 'otherTenantName', 
        actualTenantFullname: 'actualTenantFullname',
        infestation: 'infestation',
        propertyType: 'propertyType'
    };

    // Whitelist of valid DB columns to prevent "column does not exist" errors
    const validColumns = [
        'id', 'name', 'phone', 'email', 'address', 'postcode', 'dob', 'livingDuration', 'tenantType', 'landlordName',
        'damp', 'dampLocation', 'dampRooms', 'dampSurface', 'dampDuration', 'dampCause', 'dampDamage', 'dampHealth',
        'leak', 'leakLocation', 'leakSource', 'leakStart', 'leakDamage', 'leakBelongings', 'leakCracks',
        'issuesElectrics', 'issuesHeating', 'issuesStructural', 'infestation', 'reported', 'reportCount',
        'reportFirst', 'reportLast', 'reportResponse', 'reportAttempt', 'reportStatus', 'arrears', 'arrearsAmount',
        'alreadySubmitted', 'additionalNotes', 'agentName', 'timestamp', 'isSubmitted', 'leadStatus', 'leadStage',
        'agentData', 'uniqueToken', 'propertyType', 'tenancyOnName', 'tenancyType', 'isNameOnJoint',
        'otherTenantName', 'actualTenantFullname', 'assignedCompanyId', 'assignedSolicitorId', 'mobileNumber'
    ];
    
    // Save a DEEP CLONE of the original raw data for the agentData backup
    const originalRawData = JSON.parse(JSON.stringify(data));
    
    const rawPhone = data.phone || data.mobileNumber || data.mobile_number;
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

    // 2. Find existing lead by phone (Robust searching with variations)
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
    const orQuery = uniqueVariations.flatMap(v => [`phone.eq.${v}`, `mobileNumber.eq.${v}`]).join(',');

    const { data: existing, error: findError } = await supabase
        .from('submissions')
        .select('id, leadStatus, agentData, agentName, phone, mobileNumber')
        .or(orQuery)
        .order('timestamp', { ascending: false })
        .limit(1);

    if (findError) return res.status(500).json({ error: findError.message });
    const existingLead = (existing && existing.length > 0) ? existing[0] : null;

    if (existingLead) {
        // UPDATE EXISTING LEAD
        const safeUpdate = {};
        for (const [key, val] of Object.entries(data)) {
            if (val !== null && val !== undefined) {
                safeUpdate[key] = val;
            }
        }
        
        if (rawAgentName) {
            safeUpdate.agentName = rawAgentName;
        } else if (existingLead.agentName && !safeUpdate.agentName) {
            safeUpdate.agentName = existingLead.agentName;
        }
        
        if (!existingLead.agentData) {
            safeUpdate.agentData = originalRawData;
        }
        
        if (isDraft) {
           delete safeUpdate.leadStatus;
           safeUpdate.isSubmitted = false;
           safeUpdate.leadStage = 'Draft';
        } else {
           const currentStatus = (existingLead.leadStatus || '').trim();
           const hiddenStatuses = ['archived', 'closed', 'rejected', 'agent saved', ''];
           if (hiddenStatuses.includes(currentStatus.toLowerCase())) {
              safeUpdate.leadStatus = 'New Lead';
              safeUpdate.leadStage = 'New Lead';
           } else {
              safeUpdate.leadStage = currentStatus || 'New Lead';
           }
           safeUpdate.isSubmitted = true;
        }

        const { data: updated, error: updErr } = await supabase.from('submissions').update(safeUpdate).eq('id', existingLead.id).select();
        if (updErr) throw updErr;
        return res.status(200).json({ success: true, message: "Lead updated", lead: updated[0] });

    } else {
        // INSERT NEW LEAD
        data.isSubmitted = !isDraft;
        data.leadStatus = isDraft ? 'Agent Saved' : 'New Lead';
        data.leadStage = isDraft ? 'Draft' : 'New Lead';
        
        if (!data.uniqueToken) data.uniqueToken = crypto.randomUUID();
        if (rawAgentName) data.agentName = rawAgentName;
        data.agentData = originalRawData;

        const { data: inserted, error: insErr } = await supabase.from('submissions').insert([data]).select();
        if (insErr) throw insErr;
        return res.status(200).json({ success: true, message: isDraft ? "Draft saved" : "Submission successful", lead: inserted[0] });
    }

  } catch (err) {
    console.error("Leads Public Error:", err.message);
    const envStatus = {
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    return res.status(500).json({ 
        error: "Failed to process submission: " + err.message,
        debug: envStatus
    });
  }
};
