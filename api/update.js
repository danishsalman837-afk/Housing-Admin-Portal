const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Missing Environment Variables" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: "ID required" });

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
