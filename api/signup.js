const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Full Name, email, and password are required." });
  }

  // Use service role to ensure profile creation succeeds
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      console.error("Auth Signup Error:", authError.message);
      // If user already exists, tell them to login
      if (authError.message.includes("already registered")) {
        return res.status(400).json({ error: "This email is already registered. Please log in instead." });
      }
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(400).json({ error: "User creation failed." });
    }

    // 2. Create the associated profile in our public 'profiles' table
    // We use a try/catch here so that the Auth success isn't entirely lost
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username: fullName.trim(),
          email: email.toLowerCase().trim()
        }]);

      if (profileError) {
        console.error("Profile DB Error:", profileError.message);
        // We still return success because the AUTH account is active
        return res.status(200).json({ 
          message: "Account created! Note: Profile record pending. You can now log in.",
          warning: "Database profile sync failed, but auth succeeded."
        });
      }
    } catch (dbErr) {
      console.error("Database connection error:", dbErr);
    }

    // 3. Return success
    return res.status(200).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: "Internal server error during registration." });
  }
};
