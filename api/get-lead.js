const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    // Fetch the most recent submission with this phone number
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('phone', phone)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (data && data.length > 0) {
      const lead = data[0];
      // Normalize for the form
      if (lead.dob && !lead.dateOfBirth) lead.dateOfBirth = lead.dob;
      if (lead.livingDuration && !lead.tenancyDuration) lead.tenancyDuration = lead.livingDuration;
      if (lead.damp && !lead.hasDampMould) lead.hasDampMould = lead.damp;
      if (lead.dampRooms && !lead.roomsAffected) lead.roomsAffected = lead.dampRooms;
      if (lead.dampSurface && !lead.affectedSurface) lead.affectedSurface = lead.dampSurface;
      if (lead.dampDuration && !lead.issueDuration) lead.issueDuration = lead.dampDuration;
      if (lead.dampCause && !lead.issueCause) lead.issueCause = lead.dampCause;
      if (lead.dampDamage && !lead.damageBelongings) lead.damageBelongings = lead.dampDamage;
      if (lead.dampHealth && !lead.healthProblems) lead.healthProblems = lead.dampHealth;
      if (lead.leak && !lead.hasLeaks) lead.hasLeaks = lead.leak;
      if (lead.leakCracks && !lead.cracksDamage) lead.cracksDamage = lead.leakCracks;
      if (lead.issues_electrics && !lead.faultyElectrics) lead.faultyElectrics = lead.issues_electrics;
      if (lead.issues_heating && !lead.heatingIssues) lead.heatingIssues = lead.issues_heating;
      if (lead.issues_structural && !lead.structuralDamage) lead.structuralDamage = lead.issues_structural;
      if (lead.reported && !lead.reportedOverMonth) lead.reportedOverMonth = lead.reported;
      if (lead.arrears && !lead.rentalArrears) lead.rentalArrears = lead.arrears;
      return res.status(200).json(lead);
    }
    return res.status(200).json(null);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
