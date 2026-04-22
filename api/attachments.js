const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  const action = req.query.action || req.body.action;

  try {
    // ═════════════════════════════════════════════════
    // ACTION: UPLOAD
    // ═════════════════════════════════════════════════
    if (action === 'upload' || !action) {
      const { leadId, name, type, content } = req.body;
      if (!leadId || !content) return res.status(400).json({ error: "Missing required fields" });

      const base64Data = content.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');

      const timestamp = Date.now();
      const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `lead_${leadId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('leads')
        .upload(filePath, buffer, { contentType: type, upsert: true });

      if (uploadError) return res.status(500).json({ error: "Storage upload failed: " + uploadError.message });

      const { data: { publicUrl } } = supabase.storage.from('leads').getPublicUrl(filePath);

      const { data: lead, error: fetchError } = await supabase.from('submissions').select('attachments').eq('id', leadId).single();
      if (fetchError) return res.status(500).json({ error: fetchError.message });

      let attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
      attachments.push({ name, url: publicUrl, path: filePath, type, size: buffer.length, uploadedAt: new Date().toISOString() });

      const { data: updatedLead, error: updateError } = await supabase.from('submissions').update({ attachments }).eq('id', leadId).select().single();
      if (updateError) return res.status(500).json({ error: updateError.message });

      return res.status(200).json(updatedLead);
    }

    // ═════════════════════════════════════════════════
    // ACTION: DELETE
    // ═════════════════════════════════════════════════
    if (action === 'delete') {
      const { leadId, index } = req.body;
      if (!leadId || index === undefined) return res.status(400).json({ error: "Missing required fields" });

      const { data: lead, error: fetchError } = await supabase.from('submissions').select('attachments').eq('id', leadId).single();
      if (fetchError) return res.status(500).json({ error: fetchError.message });

      let attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
      if (index < 0 || index >= attachments.length) return res.status(400).json({ error: "Invalid index" });

      const toDelete = attachments[index];
      attachments.splice(index, 1);

      const { data: updatedLead, error: updateError } = await supabase.from('submissions').update({ attachments }).eq('id', leadId).select().single();
      if (updateError) return res.status(500).json({ error: updateError.message });

      if (toDelete.path) {
          await supabase.storage.from('leads').remove([toDelete.path]);
      }

      return res.status(200).json(updatedLead);
    }

    // ═════════════════════════════════════════════════
    // ACTION: DELETE ALL
    // ═════════════════════════════════════════════════
    if (action === 'delete-all') {
      const { leadId } = req.body;
      if (!leadId) return res.status(400).json({ error: "Missing Lead ID" });

      const { data: lead, error: fetchError } = await supabase.from('submissions').select('attachments').eq('id', leadId).single();
      if (fetchError) return res.status(500).json({ error: fetchError.message });

      const attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
      if (attachments.length === 0) return res.status(200).json({ attachments: [] });

      // Update DB to empty array
      const { data: updatedLead, error: updateError } = await supabase.from('submissions').update({ attachments: [] }).eq('id', leadId).select().single();
      if (updateError) return res.status(500).json({ error: updateError.message });

      // Remove from Storage
      const paths = attachments.filter(a => a.path).map(a => a.path);
      if (paths.length > 0) {
        await supabase.storage.from('leads').remove(paths);
      }

      return res.status(200).json(updatedLead);
    }

    // ═════════════════════════════════════════════════
    // ACTION: GET SIGNED URL (For Large Files)
    // ═════════════════════════════════════════════════
    if (action === 'get-signed-url') {
      const { leadId, name, type } = req.body;
      if (!leadId || !name || !type) return res.status(400).json({ error: "Missing required fields" });

      const timestamp = Date.now();
      const safeName = name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filePath = `lead_${leadId}/${timestamp}_${safeName}`;

      const { data, error } = await supabase.storage
        .from('leads')
        .createSignedUploadUrl(filePath);

      if (error) return res.status(500).json({ error: "Failed to create upload URL: " + error.message });

      return res.status(200).json({ 
        uploadUrl: data.signedUrl, 
        token: data.token, 
        path: filePath,
        publicUrl: supabase.storage.from('leads').getPublicUrl(filePath).data.publicUrl
      });
    }

    // ═════════════════════════════════════════════════
    // ACTION: CONFIRM UPLOAD (Sync DB after direct upload)
    // ═════════════════════════════════════════════════
    if (action === 'confirm-upload') {
        const { leadId, name, url, path, type, size } = req.body;
        if (!leadId || !url || !path) return res.status(400).json({ error: "Missing required fields" });

        const { data: lead, error: fetchError } = await supabase.from('submissions').select('attachments').eq('id', leadId).single();
        if (fetchError) return res.status(500).json({ error: fetchError.message });

        let attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
        attachments.push({ 
            name, 
            url, 
            path, 
            type, 
            size: size || 0, 
            uploadedAt: new Date().toISOString() 
        });

        const { data: updatedLead, error: updateError } = await supabase.from('submissions').update({ attachments }).eq('id', leadId).select().single();
        if (updateError) return res.status(500).json({ error: updateError.message });

        return res.status(200).json(updatedLead);
    }

    return res.status(400).json({ error: "Invalid action" });


  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
