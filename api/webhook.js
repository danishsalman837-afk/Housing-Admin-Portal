const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const data = req.body;
    console.log("Receiving Lead:", data);

    const { data: inserted, error } = await supabase
      .from('submissions')
      .insert([data])
      .select();

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, message: "Lead saved successfully", detail: inserted[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Server Crashed." });
  }
};
