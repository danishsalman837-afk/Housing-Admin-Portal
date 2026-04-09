const { createSupabaseClient, assertEnv } = require("./supabaseClient");

/**
 * API endpoint to manage solicitor activity records.
 * GET  — Fetch all solicitor activity records (with lead + member details)
 * POST — Create or update a solicitor activity record
 */
module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('solicitor_activity')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: "Server Error: " + err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, action, ...fields } = req.body;

      // Delete
      if (id && action === 'delete') {
        const { error } = await supabase.from('solicitor_activity').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }

      // Update existing
      if (id) {
        const { data, error } = await supabase
          .from('solicitor_activity')
          .update(fields)
          .eq('id', id)
          .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
      }

      // Create new activity record
      if (!fields.lead_id) return res.status(400).json({ error: "lead_id is required" });
      if (!fields.solicitor_id) return res.status(400).json({ error: "solicitor_id is required" });

      fields.status = fields.status || 'Allocated';
      fields.created_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('solicitor_activity')
        .insert([fields])
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0]);
    } catch (err) {
      return res.status(500).json({ error: "Server Error: " + err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
