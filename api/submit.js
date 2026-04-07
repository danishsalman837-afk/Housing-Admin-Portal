const { createSupabaseClient, assertEnv } = require("./supabaseClient");

// Webhook for Primo Dialler to push leads directly to Admin Dashboard
module.exports = async function handler(req, res) {
  // Allow dialers to send data via POST (JSON) or GET (URL Parameters)
  const data = (req.method === 'POST') ? req.body : req.query;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "No data received. Ensure you are sending fields like name, phone, etc." });
  }

  // Normalize (maps form names to database column names)
  const mapping = {
      dateOfBirth: 'dob',
      tenancyDuration: 'livingDuration',
      hasDampMould: 'damp',
      roomsAffected: 'dampRooms',
      affectedSurface: 'dampSurface',
      issueDuration: 'dampDuration',
      issueCause: 'dampCause',
      damageBelongings: 'dampDamage',
      healthProblems: 'dampHealth',
      hasLeaks: 'leak',
      cracksDamage: 'leakCracks',
      faultyElectrics: 'issues_electrics',
      heatingIssues: 'issues_heating',
      structuralDamage: 'issues_structural',
      reportedOverMonth: 'reported',
      rentalArrears: 'arrears'
  };
  for (const [formKey, dbKey] of Object.entries(mapping)) {
      if (data[formKey] !== undefined) {
          data[dbKey] = data[formKey];
          delete data[formKey];
      }
  }

  // Always update timestamp to keep recent activity at the top
  data.timestamp = new Date().toISOString();

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    let isUpdate = false;
    let existingId = null;

    if (data.phone) {
      const { data: existing, error: findError } = await supabase
        .from('submissions')
        .select('id, leadStatus')
        .eq('phone', data.phone)
        .order('timestamp', { ascending: false })
        .limit(1);
        
      if (findError) return res.status(500).json({ error: findError.message });
      const existingLead = (existing && existing.length > 0) ? existing[0] : null;
        
      if (existingLead) {
        isUpdate = true;
        existingId = existingLead.id;
        
        // Mark as New Lead upon submission ONLY if it was currently hidden (Agent Saved or null)
        // If it's already live (e.g. New Lead, Accepted, etc.), keep existing status
        const currentStatus = existingLead.leadStatus;
        if (!currentStatus || currentStatus === 'Agent Saved') {
            data.leadStatus = 'New Lead';
        } else {
            // Keep existing status
            delete data.leadStatus;
        }
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
      if (!data.leadStatus || data.leadStatus === 'Agent Saved') {
          data.leadStatus = 'New Lead';
      }
      
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
