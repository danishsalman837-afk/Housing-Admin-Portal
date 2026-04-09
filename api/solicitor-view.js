const { createSupabaseClient, assertEnv, normalizeLead } = require("./supabaseClient");

/**
 * GET /api/solicitor-view?token=<unique_token>
 *   Returns lead details for the public solicitor page.
 *   Masks contact info unless the solicitor has already accepted the lead.
 *
 * POST /api/solicitor-view
 *   Body: { token, action: 'accept' | 'reject', rejection_reason? }
 *   Handles accept/reject actions from the solicitor page.
 */
module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  // ─── GET: Fetch lead data by token ───
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Token is required." });

    try {
      // Fetch the lead by unique_token
      const { data: lead, error: leadErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('unique_token', token)
        .single();

      if (leadErr || !lead) return res.status(404).json({ error: "Lead not found or link is invalid." });

      // Fetch the associated activity
      const { data: activities, error: actErr } = await supabase
        .from('solicitor_activity')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const activity = (activities && activities.length > 0) ? activities[0] : null;
      const activityStatus = activity ? activity.status : 'Unknown';

      // Normalize the lead for consistent field names
      const normalized = normalizeLead({ ...lead });

      // Build the response — mask contact info unless accepted
      const isAccepted = activityStatus === 'Accepted';

      const response = {
        id: lead.id,
        activity_id: activity ? activity.id : null,
        status: activityStatus,

        // Always visible fields
        name: normalized.name || normalized.first_name || '---',
        tenantType: normalized.tenantType || '---',
        landlordName: normalized.landlordName || '---',
        address: normalized.address || '---',
        postcode: normalized.postcode || '---',

        // Disrepair questions — always visible
        damp: normalized.damp || '---',
        dampLocation: normalized.dampLocation || '---',
        dampRooms: normalized.dampRooms || '---',
        dampSurface: normalized.dampSurface || '---',
        dampDuration: normalized.dampDuration || '---',
        dampCause: normalized.dampCause || '---',
        dampDamage: normalized.dampDamage || '---',
        dampHealth: normalized.dampHealth || '---',
        leak: normalized.leak || '---',
        leakLocation: normalized.leakLocation || '---',
        leakSource: normalized.leakSource || '---',
        leakStart: normalized.leakStart || '---',
        leakDamage: normalized.leakDamage || '---',
        leakCracks: normalized.leakCracks || '---',
        leakBelongings: normalized.leakBelongings || '---',
        issues_electrics: normalized.issues_electrics || '---',
        issues_heating: normalized.issues_heating || '---',
        issues_structural: normalized.issues_structural || '---',
        reported: normalized.reported || '---',
        reportCount: normalized.reportCount || '---',
        reportFirst: normalized.reportFirst || '---',
        reportLast: normalized.reportLast || '---',
        reportResponse: normalized.reportResponse || '---',
        reportAttempt: normalized.reportAttempt || '---',
        reportStatus: normalized.reportStatus || '---',

        // Contact fields — masked unless accepted
        email: isAccepted ? (normalized.email || '---') : '••••••••@••••.com',
        phone: isAccepted ? (normalized.phone || normalized.mobile_number || '---') : '•••• ••• ••••',
        dob: isAccepted ? (normalized.dob || '---') : '••/••/••••',

        // Flag for frontend
        contactRevealed: isAccepted,
      };

      return res.status(200).json(response);
    } catch (err) {
      console.error("Solicitor View GET Error:", err);
      return res.status(500).json({ error: "Server Error: " + err.message });
    }
  }

  // ─── POST: Handle accept/reject ───
  if (req.method === 'POST') {
    const { token, action, rejection_reason } = req.body;

    if (!token) return res.status(400).json({ error: "Token is required." });
    if (!action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'accept' or 'reject'." });
    }

    try {
      // Fetch the lead
      const { data: lead, error: leadErr } = await supabase
        .from('submissions')
        .select('id, name, first_name')
        .eq('unique_token', token)
        .single();

      if (leadErr || !lead) return res.status(404).json({ error: "Lead not found or link is invalid." });

      // Fetch the latest activity for this lead
      const { data: activities, error: actErr } = await supabase
        .from('solicitor_activity')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (actErr || !activities || activities.length === 0) {
        return res.status(404).json({ error: "No solicitor activity found for this lead." });
      }

      const activity = activities[0];

      // Prevent double-action
      if (activity.status === 'Accepted' || activity.status === 'Rejected') {
        return res.status(400).json({ error: `This lead has already been ${activity.status.toLowerCase()}.` });
      }

      if (action === 'accept') {
        // Update activity to Accepted
        const { error: updErr } = await supabase
          .from('solicitor_activity')
          .update({ status: 'Accepted' })
          .eq('id', activity.id);

        if (updErr) return res.status(500).json({ error: updErr.message });

        // Update lead actual_status to Assigned
        await supabase
          .from('submissions')
          .update({ actual_status: 'Assigned' })
          .eq('id', lead.id);

        // Fetch the full lead with contact info for the response
        const { data: fullLead } = await supabase
          .from('submissions')
          .select('email, phone, mobile_number, dob')
          .eq('id', lead.id)
          .single();

        const normalized = normalizeLead({ ...(fullLead || {}) });

        return res.status(200).json({
          success: true,
          status: 'Accepted',
          contactDetails: {
            email: normalized.email || '---',
            phone: normalized.phone || normalized.mobile_number || '---',
            dob: normalized.dob || '---',
          }
        });

      } else if (action === 'reject') {
        if (!rejection_reason || !rejection_reason.trim()) {
          return res.status(400).json({ error: "A rejection reason is required." });
        }

        // Update activity to Rejected with reason
        const { error: updErr } = await supabase
          .from('solicitor_activity')
          .update({ status: 'Rejected', rejection_reason: rejection_reason.trim() })
          .eq('id', activity.id);

        if (updErr) return res.status(500).json({ error: updErr.message });

        // Update lead actual_status to Re-assign
        await supabase
          .from('submissions')
          .update({ actual_status: 'Re-assign' })
          .eq('id', lead.id);

        return res.status(200).json({
          success: true,
          status: 'Rejected',
        });
      }

    } catch (err) {
      console.error("Solicitor View POST Error:", err);
      return res.status(500).json({ error: "Server Error: " + err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
