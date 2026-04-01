const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  // Use the MASTER KEY for admin data access
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Missing Server Environment Variables" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("Server Crash:", err.message);
    return res.status(500).json({ error: "API Crashed. Check Vercel Logs." });
  }
};
