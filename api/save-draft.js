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

    // Normalize (handles transition from old form names)
    if (data.dob && !data.dateOfBirth) data.dateOfBirth = data.dob;
    if (data.livingDuration && !data.tenancyDuration) data.tenancyDuration = data.livingDuration;
    if (data.damp && !data.hasDampMould) data.hasDampMould = data.damp;
    if (data.leak && !data.hasLeaks) data.hasLeaks = data.leak;
    if (data.reported && !data.reportedOverMonth) data.reportedOverMonth = data.reported;
    if (data.arrears && !data.rentalArrears) data.rentalArrears = data.arrears;

    // Attempt to update existing with this phone number or insert new
    // We search for most recent record with this phone
    const { data: existing, error: findError } = await supabase
      .from('submissions')
      .select('id')
      .eq('phone', data.phone)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (findError) return res.status(500).json({ error: findError.message });

    let response;
    if (existing && existing.length > 0) {
        // Ensure status is 'Agent Saved' for drafts so they don't hit the dashboard yet
        if (!data.leadStatus || data.leadStatus === 'Agent Saved') {
            data.leadStatus = 'Agent Saved';
        }
        response = await supabase
            .from('submissions')
            .update(data)
            .eq('id', existing[0].id)
            .select();
    } else {
        // Insert
        // Ensure status is 'Agent Saved' for new drafts
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
