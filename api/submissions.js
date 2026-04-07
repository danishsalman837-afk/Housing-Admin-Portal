const { createSupabaseClient, assertEnv, normalizeLead } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .neq('leadStatus', 'Archived')
      .order('timestamp', { ascending: false });

    if (error) return res.status(500).json({ error: "Database Error: " + error.message });
    const normalizedData = (data || []).map(normalizeLead);
    return res.status(200).json(normalizedData);
  } catch (err) {
    return res.status(500).json({ error: "Server Crashed. Check Dependencies." });
  }
};
