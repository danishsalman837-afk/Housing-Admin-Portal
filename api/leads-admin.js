const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;
  const route = req.query.route || req.body.route;

  try {
    // ═════════════════════════════════════════════════
    // GET: LIST ALL (Submissions)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (route === 'list' || (!req.query.phone && !route))) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .neq('leadStatus', 'Agent Saved')
        .neq('leadStatus', 'Archived')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      
      const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('lead_id, message_body')
        .order('created_at', { ascending: false });

      const msgMap = {};
      if (!msgError && messages) {
          for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].lead_id) msgMap[messages[i].lead_id] = messages[i].message_body;
          }
      }

      const normalizedData = (data || []).map(lead => {
          let l = normalizeLead(lead);
          if (msgMap[l.id]) {
              l.last_message = msgMap[l.id];
          }
          return l;
      });
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
      const orQuery = strippedPhone 
        ? `phone.eq."${phone}",mobile_number.eq."${phone}",phone.eq."${strippedPhone}",mobile_number.eq."${strippedPhone}"`
        : `phone.eq."${phone}",mobile_number.eq."${phone}"`;

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or(orQuery)
        .order('created_at', { ascending: false })
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
        dateOfBirth: 'dob', tenancyDuration: 'livingDuration', hasDampMould: 'damp', roomsAffected: 'dampRooms',
        affectedSurface: 'dampSurface', issueDuration: 'dampDuration', issueCause: 'dampCause', damageBelongings: 'dampDamage',
        healthProblems: 'dampHealth', hasLeaks: 'leak', cracksDamage: 'leakCracks', faultyElectrics: 'issues_electrics',
        heatingIssues: 'issues_heating', structuralDamage: 'issues_structural', reportedOverMonth: 'reported',
        rentalArrears: 'arrears', dampLocation: 'dampLocation', leakLocation: 'leakLocation', leakSource: 'leakSource',
        leakStart: 'leakStart', leakDamage: 'leakDamage', leakBelongings: 'leakBelongings', reportCount: 'reportCount',
        reportFirst: 'reportFirst', reportLast: 'reportLast', reportResponse: 'reportResponse', reportAttempt: 'reportAttempt', reportStatus: 'reportStatus',
        arrearsAmount: 'arrearsAmount', alreadySubmitted: 'alreadySubmitted', additionalNotes: 'additionalNotes', 
        agentName: 'agent_name', name: 'name', phone: 'phone',
        tenancy_on_name: 'tenancy_on_name', tenancy_type: 'tenancy_type', is_name_on_joint: 'is_name_on_joint', 
        other_tenant_name: 'other_tenant_name', actual_tenant_fullname: 'actual_tenant_fullname',
        infestation: 'infestation',
        property_type: 'property_type'
    };
      for (const [formKey, dbKey] of Object.entries(mapping)) {
          if (updates[formKey] !== undefined) {
              updates[dbKey] = updates[formKey];
              if (formKey !== dbKey) delete updates[formKey];
          }
      }

      // Backup original agent data if this is the first edit
      const { data: currentLead } = await supabase.from('submissions').select('*').eq('id', id).single();
      if (currentLead && !currentLead.agent_data) {
          updates.agent_data = currentLead;
          updates.is_edited = true;
      }

      // If leadStatus is being updated, also update lead_stage for export consistency
      if (updates.leadStatus) {
          updates.lead_stage = updates.leadStatus;
          // If it's being updated in admin, it's definitely submitted (or was already)
          updates.is_submitted = true; 
      }

      const { data, error } = await supabase.from('submissions').update(updates).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0] || {});
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
};
