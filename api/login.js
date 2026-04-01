const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { createSupabaseClient, assertEnv } = require("./supabaseClient");

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Auth Error:", error.message);
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    // Success: Return session to client
    return res.status(200).json({ session: data.session });
  } catch (err) {
    return res.status(500).json({ error: "Server authentication error." });
  }
};
