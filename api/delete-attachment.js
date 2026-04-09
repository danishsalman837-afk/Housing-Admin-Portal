const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const { leadId, index } = req.body;
    if (!leadId || index === undefined) return res.status(400).json({ error: "Missing required fields" });

    // Update the lead's attachments array
    const { data: lead, error: fetchError } = await supabase
      .from('submissions')
      .select('attachments')
      .eq('id', leadId)
      .single();

    if (fetchError) return res.status(500).json({ error: fetchError.message });

    let attachments = Array.isArray(lead.attachments) ? lead.attachments : [];
    if (index < 0 || index >= attachments.length) return res.status(400).json({ error: "Invalid index" });

    const toDelete = attachments[index];
    attachments.splice(index, 1);

    // Update DB
    const { data: updatedLead, error: updateError } = await supabase
      .from('submissions')
      .update({ attachments })
      .eq('id', leadId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    // Optional: Delete from storage as well
    if (toDelete.path) {
        await supabase.storage.from('leads').remove([toDelete.path]);
    }

    return res.status(200).json(updatedLead);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error during deletion" });
  }
};
