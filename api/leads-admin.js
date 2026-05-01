const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;
  const route = req.query.route || req.body.route;

  try {
    // ═════════════════════════════════════════════════
    // DIAGNOSTIC PING
    // ═════════════════════════════════════════════════
    if (method === 'GET' && route === 'ping') {
        const url = process.env.SUPABASE_URL || 'NOT_SET';
        const projectId = url.split('.')[0].split('//')[1] || 'UNKNOWN';
        
        // Fetch column metadata
        const { data: cols, error: metaError } = await supabase.from('submissions').select('*').limit(1);
        const availableColumns = !metaError && cols && cols.length > 0 ? Object.keys(cols[0]) : [];

        return res.status(200).json({ 
            status: "online", 
            projectId: projectId,
            urlMasked: url.substring(0, 12) + "...",
            columns: availableColumns
        });
    }

    // ═════════════════════════════════════════════════
    // GET: LIST ALL (Submissions)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (route === 'list' || (!req.query.phone && !route))) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('isSubmitted', true)
        .neq('leadStatus', 'Archived')
        .order('timestamp', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      
      const normalizedData = (data || []).map(lead => normalizeLead(lead));
      return res.status(200).json(normalizedData);
    }

    // ═════════════════════════════════════════════════
    // GET: SINGLE BY PHONE (Get-Lead)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (req.query.phone || route === 'get')) {
      const { phone } = req.query;
      if (!phone) {
        return res.status(400).json({ error: 'Phone parameter is required' });
      }

      const strippedPhone = phone.replace(/\D/g, '');
      let variations = [phone, strippedPhone];
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

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or(orQuery)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) return res.status(500).json({ error: error.message });
      if (data && data.length > 0) return res.status(200).json(normalizeLead(data[0]));
      return res.status(200).json(null);
    }

    // ═════════════════════════════════════════════════
    // POST: UPDATE (Update)
    // ═════════════════════════════════════════════════
    if (method === 'POST') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });

    // Mapping: Form Key -> DB Key
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
      for (const [formKey, dbKey] of Object.entries(mapping)) {
          if (updates[formKey] !== undefined) {
              updates[dbKey] = updates[formKey];
              if (formKey !== dbKey) delete updates[formKey];
          }
      }

      // Backup original agent data
      const { data: currentLead } = await supabase.from('submissions').select('*').eq('id', id).single();
      if (currentLead && !currentLead.agentData) {
          updates.agentData = currentLead;
          updates.isEdited = true;
      }

      if (updates.leadStatus) {
          updates.leadStage = updates.leadStatus;
          updates.isSubmitted = true; 
      }

      const { data, error } = await supabase.from('submissions').update(updates).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0] || {});
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error("Leads Admin Error:", err.message);
    const envStatus = {
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    return res.status(500).json({ 
        error: "Server Error: " + err.message,
        debug: envStatus
    });
  }
};
