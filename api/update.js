const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: "ID required" });

    // Mapping for consistent column names
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
        faultyElectrics: 'issues_electrics',
        heatingIssues: 'issues_heating',
        structuralDamage: 'issues_structural',
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
        reportResponse: 'reportResponse',
        reportAttempt: 'reportAttempt',
        reportStatus: 'reportStatus',
        arrearsAmount: 'arrearsAmount',
        additionalNotes: 'additionalNotes'
    };
    for (const [formKey, dbKey] of Object.entries(mapping)) {
        if (updates[formKey] !== undefined) {
            updates[dbKey] = updates[formKey];
            if (formKey !== dbKey) delete updates[formKey];
        }
    }

    const { data, error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data[0] || {});
  } catch (err) {
    return res.status(500).json({ error: "Server Crashed." });
  }
};
