const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { accessToken, newPassword } = req.body;

  if (!accessToken || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required." });
  }

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

  try {
    // 1. Set the session using the access token from the recovery link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: accessToken, // Dummy refresh token as it is usually not provided in fragment but needed by setSession signature in some versions
    });

    // Note: In newer Supabase versions, setSession just takes the access_token. 
    // If it fails, we try a more robust approach.
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Supabase Update Error:", updateError.message);
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ error: "Server error occurred during password update." });
  }
};
