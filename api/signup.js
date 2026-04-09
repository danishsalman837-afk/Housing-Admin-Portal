const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Username, email, and password are required." });
  }

  // Use service role to ensure profile creation succeeds
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    // 1. Sign up the user in Supabase Auth
    // Note: This creates a user in the auth.users table
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (authError) {
      console.error("Auth Signup Error:", authError.message);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: "User creation failed." });
    }

    // 2. Create the associated profile in our public 'profiles' table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim()
      }]);

    if (profileError) {
      console.error("Profile Creation Error:", profileError.message);
      // Even if profile fails, the Auth user is created. 
      // You may want to handle cleanup or inform the user.
      return res.status(500).json({ error: "Account created but profile setup failed. Please contact admin." });
    }

    // 3. Return success
    return res.status(200).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Internal server error during registration." });
  }
};
