const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { leadId, name, type, content } = req.body;
    if (!leadId || !content) return res.status(400).json({ error: "Missing required fields" });

    // Extract base64 format: data:image/png;base64,iVBORw...
    const base64Data = content.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');

    // Create unique path
    const timestamp = Date.now();
    const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const filePath = `lead_${leadId}/${timestamp}_${safeName}`;

    // Upload to 'leads' bucket
    const { data, error: uploadError } = await supabase.storage
      .from('leads')
      .upload(filePath, buffer, {
        contentType: type,
        upsert: true
      });

    if (uploadError) {
      // If bucket doesn't exist, this might fail. We should try to create it or tell user.
      return res.status(500).json({ error: "Storage upload failed: " + uploadError.message });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('leads')
      .getPublicUrl(filePath);

    // Update the lead's attachments array
    const { data: lead, error: fetchError } = await supabase
      .from('submissions')
      .select('attachments')
      .eq('id', leadId)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    let attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
    const newAttachment = {
      name: name,
      url: publicUrl,
      path: filePath,
      type: type,
      size: buffer.length,
      uploadedAt: new Date().toISOString()
    };
    attachments.push(newAttachment);

    const { data: updatedLead, error: updateError } = await supabase
      .from('submissions')
      .update({ attachments })
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    return res.status(200).json(updatedLead);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error during upload" });
  }
};
