const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, redirectTo } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || 'http://localhost:3000/update-password.html',
    });

    if (error) {
      console.error("Supabase Reset Error:", error.message);
      return res.status(error.status || 400).json({ error: error.message });
    }

    return res.status(200).json({ message: "Reset email sent successfully." });
  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ error: "Server error occurred during password recovery." });
  }
};
