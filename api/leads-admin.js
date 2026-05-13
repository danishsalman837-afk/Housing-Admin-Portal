const { createSupabaseClient, assertEnv, normalizeLead } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;
  const route = req.query.route || req.body.route;

  try {
    // ═════════════════════════════════════════════════
    // DIAGNOSTIC PING
    // ═════════════════════════════════════════════════
    if (method === 'GET' && route === 'ping') {
        const url = process.env.SUPABASE_URL || 'NOT_SET';
        const projectId = url.split('.')[0].split('//')[1] || 'UNKNOWN';
        const { data: cols } = await supabase.from('submissions').select('*').limit(1);
        return res.status(200).json({ 
            status: "online", 
            projectId, 
            columns: cols && cols.length > 0 ? Object.keys(cols[0]) : [] 
        });
    }

    // ═════════════════════════════════════════════════
    // GET: LIST ALL
    // ═════════════════════════════════════════════════
    if (method === 'GET' && (route === 'list' || (!req.query.phone && !route))) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .or('isSubmitted.eq.true,is_submitted.eq.true')
        .neq('leadStatus', 'Archived')
        .order('timestamp', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json((data || []).map(l => normalizeLead(l)));
    }

    // ═════════════════════════════════════════════════
    // POST: UPDATE (Safe & Filtered)
    // ═════════════════════════════════════════════════
    if (method === 'POST') {
      const { id, ...rawUpdates } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });

      // 1. Get actual columns from DB to prevent "column not found" errors
      const { data: colCheck } = await supabase.from('submissions').select('*').limit(1);
      const validCols = colCheck && colCheck.length > 0 ? Object.keys(colCheck[0]) : [];

      const updates = {};
      
      // 2. Map known fields and handle dual-columns
      if (rawUpdates.leadStatus) {
          if (validCols.includes('leadStatus')) updates.leadStatus = rawUpdates.leadStatus;
          if (validCols.includes('leadStage')) updates.leadStage = rawUpdates.leadStatus;
          if (validCols.includes('lead_stage')) updates.lead_stage = rawUpdates.leadStatus;
          if (validCols.includes('isSubmitted')) updates.isSubmitted = true;
          if (validCols.includes('is_submitted')) updates.is_submitted = true;
      }

      // 3. Mark as edited
      if (validCols.includes('isEdited')) updates.isEdited = true;
      if (validCols.includes('is_edited')) updates.is_edited = true;

      // 4. Pass through other valid fields
      for (const key of Object.keys(rawUpdates)) {
          if (validCols.includes(key) && key !== 'id') {
              updates[key] = rawUpdates[key];
          }
      }

      // 5. Special fallback for notes (check both columns)
      if (rawUpdates.notes && !validCols.includes('notes') && validCols.includes('call_notes')) {
          updates.call_notes = rawUpdates.notes;
      }

      const { data, error } = await supabase.from('submissions').update(updates).eq('id', id).select();
      
      if (!error && updates.leadStatus) {
          const status = updates.leadStatus;
          if (status === 'Accepted' || status === 'Rejected' || status === 'Closed') {
              const now = new Date().toISOString();
              const actUpdate = { status };
              const subTimestampUpdate = {};

              if (status === 'Accepted') {
                  actUpdate.accepted_at = now;
                  if (validCols.includes('accepted_at')) subTimestampUpdate.accepted_at = now;
              }
              if (status === 'Rejected') {
                  actUpdate.rejected_at = now;
                  if (validCols.includes('rejected_at')) subTimestampUpdate.rejected_at = now;
              }
              if (status === 'Closed') {
                  if (validCols.includes('closed_at')) subTimestampUpdate.closed_at = now;
              }

              // Update solicitor_activity (if an activity record exists for this lead)
              await supabase.from('solicitor_activity').update(actUpdate).eq('lead_id', id);

              // Update submissions table directly with the timestamp
              if (Object.keys(subTimestampUpdate).length > 0) {
                  await supabase.from('submissions').update(subTimestampUpdate).eq('id', id);
              }
          }
      }
      
      if (error) {
          console.error("Update Error:", error);
          return res.status(500).json({ error: error.message, details: error.hint });
      }
      return res.status(200).json(data[0] || {});
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
