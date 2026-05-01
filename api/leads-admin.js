const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;
  const route = req.query.route || req.body.route;

  try {
    // ═════════════════════════════════════════════════
    // DIAGNOSTIC PING (With column detection)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && route === 'ping') {
        const url = process.env.SUPABASE_URL || 'NOT_SET';
        const projectId = url.split('.')[0].split('//')[1] || 'UNKNOWN';
        
        const { data: cols, error: metaError } = await supabase.from('submissions').select('*').limit(1);
        const availableColumns = !metaError && cols && cols.length > 0 ? Object.keys(cols[0]) : [];

        return res.status(200).json({ 
            status: "online", 
            projectId: projectId,
            urlMasked: url.substring(0, 12) + "...",
            columns: availableColumns
        });
    }

    // ═════════════════════════════════════════════════
    // GET: LIST ALL (Submissions)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (route === 'list' || (!req.query.phone && !route))) {
      // We check both "isSubmitted" and the old "is_submitted" to ensure nothing is missed
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or('isSubmitted.eq.true,is_submitted.eq.true')
        .neq('leadStatus', 'Archived')
        .order('timestamp', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      
      const normalizedData = (data || []).map(lead => normalizeLead(lead));
      return res.status(200).json(normalizedData);
    }

    // ═════════════════════════════════════════════════
    // GET: SINGLE BY PHONE (Get-Lead)
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (req.query.phone || route === 'get')) {
      const { phone } = req.query;
      if (!phone) return res.status(400).json({ error: 'Phone parameter is required' });

      const strippedPhone = phone.replace(/\D/g, '');
      let variations = [phone, strippedPhone];
      if (strippedPhone.length >= 10) {
          variations.push('0' + strippedPhone.replace(/^44/, ''));
          variations.push('44' + strippedPhone.replace(/^0/, ''));
      }
      const uniqueVariations = [...new Set(variations.filter(v => v))];
      // Check both phone and mobileNumber columns
      const orQuery = uniqueVariations.flatMap(v => [`phone.eq.${v}`, `mobileNumber.eq.${v}`]).join(',');

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or(orQuery)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) return res.status(500).json({ error: error.message });
      if (data && data.length > 0) return res.status(200).json(normalizeLead(data[0]));
      return res.status(200).json(null);
    }

    // ═════════════════════════════════════════════════
    // POST: UPDATE (Update)
    // ═════════════════════════════════════════════════
    if (method === 'POST') {
      const { id, ...updates } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });

      // Ensure we update both the old and new columns for consistency
      if (updates.leadStatus) {
          updates.leadStage = updates.leadStatus;
          updates.lead_stage = updates.leadStatus;
          updates.isSubmitted = true; 
          updates.is_submitted = true;
      }

      const { data, error } = await supabase.from('submissions').update(updates).eq('id', id).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data[0] || {});
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error("Leads Admin Error:", err.message);
    return res.status(500).json({ error: "Server Error: " + err.message });
  }
};
