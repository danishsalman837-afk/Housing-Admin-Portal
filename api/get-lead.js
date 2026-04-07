const { createSupabaseClient, assertEnv, normalizeLead } = require("./supabaseClient");

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
      const lead = normalizeLead(data[0]);
      return res.status(200).json(lead);
    }
    return res.status(200).json(null);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
