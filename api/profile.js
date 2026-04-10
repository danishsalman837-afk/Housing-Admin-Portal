const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async (req, res) => {
    if (!assertEnv("service", res)) return;
    const supabase = createSupabaseClient("service");

    const { route } = req.query;

    if (req.method === 'POST') {
        if (route === 'update-profile') {
            const { id, username, email, avatar_url } = req.body;
            if (!id) return res.status(400).json({ error: "User ID is required" });

            const updateData = {};
            if (username !== undefined) updateData.username = username;
            if (email !== undefined) updateData.email = email;
            if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

            // 1. Update profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (profileError) return res.status(500).json({ error: profileError.message });

            // 2. Also update auth user metadata if username/avatar changed
            const authUpdate = {
                data: {
                    full_name: username,
                    avatar_url: avatar_url
                }
            };
            // Only update email in auth if it's different (note: this might trigger verification)
            if (email) authUpdate.email = email;

            const { data: user, error: authError } = await supabase.auth.admin.updateUserById(id, authUpdate);

            if (authError) return res.status(500).json({ error: authError.message });

            return res.status(200).json({ profile, user: user.user });
        }

        if (route === 'update-password') {
            const { id, password } = req.body;
            if (!id || !password) return res.status(400).json({ error: "ID and password are required" });

            const { data, error } = await supabase.auth.admin.updateUserById(id, {
                password: password
            });

            if (error) return res.status(500).json({ error: error.message });

            return res.status(200).json({ message: "Password updated successfully" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
};
