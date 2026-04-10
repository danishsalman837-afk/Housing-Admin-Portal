const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Use a query parameter or body field to determine the action
  const action = req.query.action || req.body.action;

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

  try {
    switch (action) {
      case 'login':
        return await handleLogin(req, res, supabase);
      case 'signup':
        return await handleSignup(req, res, supabase);
      case 'forgot-password':
        return await handleForgotPassword(req, res, supabase);
      case 'update-password':
        return await handleUpdatePassword(req, res, supabase);
      default:
        return res.status(400).json({ error: "Invalid or missing auth action." });
    }
  } catch (err) {
    console.error(`Auth Error [${action}]:`, err);
    return res.status(500).json({ error: "Server authentication error." });
  }
};

async function handleLogin(req, res, supabase) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  return res.status(200).json({ session: data.session });
}

async function handleSignup(req, res, supabase) {
  const { email, password, fullName } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, username: email.split('@')[0] } }
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ session: data.session });
}

async function handleForgotPassword(req, res, supabase) {
  const { email, redirectTo } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || 'http://localhost:3000/update-password.html',
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: "Reset email sent." });
}

async function handleUpdatePassword(req, res, supabase) {
  const { accessToken, newPassword } = req.body;
  if (!accessToken || !newPassword) return res.status(400).json({ error: "Token and new password are required." });

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: accessToken,
  });

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return res.status(400).json({ error: updateError.message });
  return res.status(200).json({ message: "Password updated." });
}
