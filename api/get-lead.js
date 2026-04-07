const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

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

    return res.status(200).json(data && data.length > 0 ? data[0] : null);
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  }
}
