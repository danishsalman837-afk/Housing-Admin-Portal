const { createClient } = require("@supabase/supabase-js");

// Vercel serverless function to handle updates to any submission fields
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { id, ...fieldsToUpdate } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing required field: id" });
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ success: false, error: "No fields provided to update" });
    }

    const { error } = await supabase
      .from('submissions')
      .update(fieldsToUpdate)
      .eq('id', id);

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, message: "Submission updated successfully" });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, error: "An unexpected error occurred." });
  }
}
