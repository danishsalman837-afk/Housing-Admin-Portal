const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;

  try {
    // ═════════════════════════════════════════════════
    // GET: LIST ALL (Submissions)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && !req.query.phone) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .neq('leadStatus', 'Agent Saved')
        .neq('leadStatus', 'Archived')
        .order('timestamp', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      const normalizedData = (data || []).map(normalizeLead);
      return res.status(200).json(normalizedData);
    }

    // ═════════════════════════════════════════════════
    // GET: SINGLE BY PHONE (Get-Lead)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && req.query.phone) {
      const { phone } = req.query;
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('phone', phone)
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

      const mapping = {
          dateOfBirth: 'dob', tenancyDuration: 'livingDuration', hasDampMould: 'damp', roomsAffected: 'dampRooms',
          affectedSurface: 'dampSurface', issueDuration: 'dampDuration', issueCause: 'dampCause', damageBelongings: 'dampDamage',
          healthProblems: 'dampHealth', hasLeaks: 'leak', cracksDamage: 'leakCracks', faultyElectrics: 'issues_electrics',
          heatingIssues: 'issues_heating', structuralDamage: 'issues_structural', reportedOverMonth: 'reported',
          rentalArrears: 'arrears', dampLocation: 'dampLocation', leakLocation: 'leakLocation', leakSource: 'leakSource',
          leakStart: 'leakStart', leakDamage: 'leakDamage', leakBelongings: 'leakBelongings', reportCount: 'reportCount',
          reportFirst: 'reportFirst', reportResponse: 'reportResponse', reportAttempt: 'reportAttempt', reportStatus: 'reportStatus',
          arrearsAmount: 'arrearsAmount', additionalNotes: 'additionalNotes'
      };
      for (const [formKey, dbKey] of Object.entries(mapping)) {
          if (updates[formKey] !== undefined) {
              updates[dbKey] = updates[formKey];
              if (formKey !== dbKey) delete updates[formKey];
          }
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
