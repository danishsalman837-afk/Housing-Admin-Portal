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
                    username: username,
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

        if (route === 'upload-avatar') {
            const { userId, name, type, content } = req.body;
            if (!userId || !content) return res.status(400).json({ error: "Missing required fields" });

            const base64Data = content.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');

            const timestamp = Date.now();
            const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
            const filePath = `avatars/${userId}/${timestamp}_${safeName}`;

            const { error: uploadError } = await supabase.storage
                .from('leads')
                .upload(filePath, buffer, { contentType: type, upsert: true });

            if (uploadError) return res.status(500).json({ error: "Storage upload failed: " + uploadError.message });

            const { data: { publicUrl } } = supabase.storage.from('leads').getPublicUrl(filePath);

            return res.status(200).json({ url: publicUrl });
        }
    }

    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "User ID is required" });

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ profile });
    }

    return res.status(405).json({ error: "Method not allowed" });
};
