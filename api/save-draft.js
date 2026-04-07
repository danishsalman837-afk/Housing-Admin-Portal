const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const data = req.body;
    
    if (!data.phone) {
        return res.status(400).json({ error: "Phone number is required to save progress." });
    }

    // Normalize (maps form names to database column names)
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
        rentalArrears: 'arrears'
    };
    for (const [formKey, dbKey] of Object.entries(mapping)) {
        if (data[formKey] !== undefined) {
            data[dbKey] = data[formKey];
            delete data[formKey];
        }
    }

    // Always update timestamp to keep recent activity at the top
    data.timestamp = new Date().toISOString();

    // Attempt to update existing with this phone number or insert new
    // We search for most recent record with this phone
    const { data: existing, error: findError } = await supabase
      .from('submissions')
      .select('id, leadStatus')
      .eq('phone', data.phone)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (findError) return res.status(500).json({ error: findError.message });

    let response;
    if (existing && existing.length > 0) {
        // If it already exists, we preserve its current status by not including leadStatus in the update.
        // This ensures no "live" leads (New Lead, Accepted, etc.) disappear from the dashboard.
        delete data.leadStatus;

        response = await supabase
            .from('submissions')
            .update(data)
            .eq('id', existing[0].id)
            .select();
    } else {
        // Insert new record as a draft
        data.leadStatus = 'Agent Saved';
        if (!data.timestamp) data.timestamp = new Date().toISOString();
        response = await supabase
            .from('submissions')
            .insert([data])
            .select();
    }

    if (response.error) {
      console.error("Supabase Error:", response.error);
      return res.status(500).json({ success: false, error: response.error.message });
    }

    return res.status(200).json({ success: true, lead: response.data[0] });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, error: "An unexpected error occurred." });
  }
}
