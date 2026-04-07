const { createSupabaseClient, assertEnv } = require("./supabaseClient");

// Webhook for Primo Dialler to push leads directly to Admin Dashboard
module.exports = async function handler(req, res) {
  // Allow dialers to send data via POST (JSON) or GET (URL Parameters)
  const data = (req.method === 'POST') ? req.body : req.query;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No data received. Ensure you are sending fields like name, phone, etc." });
  }

  if (!assertEnv('anon', res)) return;
  const supabase = createSupabaseClient('anon');

  try {
    let isUpdate = false;
    let existingId = null;

    if (data.phone) {
      const { data: existingLead } = await supabase
        .from('submissions')
        .select('id')
        .eq('phone', data.phone)
        .maybeSingle();
        
      if (existingLead) {
        isUpdate = true;
        existingId = existingLead.id;
      }
    }

    if (isUpdate) {
      const updateData = { ...data };
      delete updateData.id;

      const { error: updateError } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', existingId);

      if (updateError) throw updateError;

      console.log("Dialer Lead Updated:", updateData);
      return res.status(200).json({ success: true, message: "Lead updated successfully!" });
    } else {
      // Add a default status if not provided
      if (!data.leadStatus) data.leadStatus = 'New Lead';
      
      // Add a timestamp if missing
      if (!data.timestamp) data.timestamp = new Date().toISOString();

      const { error } = await supabase
        .from('submissions')
        .insert([data]);

      if (error) throw error;

      console.log("Dialer Lead Saved:", data);
      return res.status(200).json({ success: true, message: "Lead captured successfully!" });
    }
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
