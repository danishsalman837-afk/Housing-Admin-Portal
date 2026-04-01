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
