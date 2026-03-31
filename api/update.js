const { createClient } = require("@supabase/supabase-js");

// Vercel serverless function to handle specific updates (like assigned solicitor)
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure env variables are configured in Vercel
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { id, solicitorName } = req.body;
    
    // We need both the row ID and the new value to update
    if (!id || typeof solicitorName === "undefined") {
        return res.status(400).json({ success: false, error: "Missing required fields (id, solicitorName)" });
    }
    
    // Update the 'submissions' table
    const { error } = await supabase
      .from('submissions')
      .update({ solicitorName: solicitorName })
      .eq('id', id);

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Success response
    return res.status(200).json({ success: true, message: "Submission updated successfully" });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, error: "An unexpected error occurred." });
  }
}
