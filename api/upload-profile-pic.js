const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { userId, name, type, content } = req.body;
    if (!userId || !content) return res.status(400).json({ error: "Missing required fields" });

    const base64Data = content.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const filePath = `avatars/${userId}/${timestamp}_${safeName}`;

    // Upload to 'profiles' bucket (make sure it exists or use 'leads' if that's the only one)
    // We'll use 'leads' bucket but 'avatars' folder for now to be safe with existing schema
    const { error: uploadError } = await supabase.storage
      .from('leads')
      .upload(filePath, buffer, { contentType: type, upsert: true });

    if (uploadError) return res.status(500).json({ error: "Storage upload failed: " + uploadError.message });

    const { data: { publicUrl } } = supabase.storage.from('leads').getPublicUrl(filePath);

    return res.status(200).json({ url: publicUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};
