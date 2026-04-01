const { createClient } = require("@supabase/supabase-js");

// Professional Webhook for Primo Dialer
// This endpoint maps Primo field names to the Dashboard table columns
module.exports = async function handler(req, res) {
  // 1. Accept POST (preferred) or GET (for simple tests)
  const incoming = (req.method === 'POST') ? req.body : req.query;

  // 2. Validate data presence
  if (!incoming || Object.keys(incoming).length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: "No data received. Ensure Primo Dialer is configured to send POST fields like name and phone." 
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Robust Mapping: Capture EVERY detail from the Agent Form / Primo tags
    // This supports both standard Primo tags and custom campaign fields
    const leadRecord = {
      // --- BASIC DETAILS ---
      name: incoming.name || 
            (incoming.first_name && incoming.last_name ? `${incoming.first_name} ${incoming.last_name}` : incoming.first_name) || 
            "Unknown Client",
      email: incoming.email || "",
      phone: incoming.phone || incoming.phone_number || incoming.contact_number || "N/A",
      dob: incoming.dob || incoming.date_of_birth || "",
      address: incoming.address || incoming.full_address || "",
      tenantType: incoming.tenantType || incoming.tenant_type || "N/A",
      livingDuration: incoming.livingDuration || incoming.how_long_living || "",

      // --- DAMP / MOULD QUESTIONS ---
      damp: incoming.damp || "No",
      dampLocation: incoming.dampLocation || "",
      dampRooms: incoming.dampRooms || "",
      dampSurface: incoming.dampSurface || "",
      dampDuration: incoming.dampDuration || "",
      dampCause: incoming.dampCause || "",
      dampDamage: incoming.dampDamage || "",
      dampHealth: incoming.dampHealth || "",

      // --- LEAK QUESTIONS ---
      leak: incoming.leak || "No",
      leakLocation: incoming.leakLocation || "",
      leakSource: incoming.leakSource || "",
      leakStart: incoming.leakStart || "",
      leakDamage: incoming.leakDamage || "",
      leakCracks: incoming.leakCracks || "",
      leakBelongings: incoming.leakBelongings || "",

      // --- ELECTRICS / HEATING / STRUCTURAL (SIMPLIFIED YES/NO) ---
      issues: (incoming.issues_electrics === 'Yes' || incoming.issues_heating === 'Yes' || incoming.issues_structural === 'Yes') ? 'Yes' : 'No',
      issues_electrics: incoming.issues_electrics || "No",
      issues_heating: incoming.issues_heating || "No",
      issues_structural: incoming.issues_structural || "No",
      
      // Keep legacy fields for dashboard compatibility if needed
      electricsMainIssue: incoming.issues_electrics || "",
      heatingMainIssue: incoming.issues_heating || "",
      structuralLocation: incoming.issues_structural || "",

      // --- REPORTING & ARREARS ---
      reported: incoming.reported || "No",
      reportCount: incoming.reportCount || "",
      reportFirst: incoming.reportFirst || "",
      reportResponse: incoming.reportResponse || "",
      reportAttempt: incoming.reportAttempt || "",
      reportStatus: incoming.reportStatus || "",
      
      arrears: incoming.arrears || "No",
      arrearsAmount: incoming.arrearsAmount || "",
      
      additionalNotes: incoming.additionalNotes || incoming.notes_from_primo || "",

      // --- DASHBOARD METADATA ---
      leadStatus: incoming.leadStatus || "New Lead",
      timestamp: incoming.timestamp || new Date().toISOString(),
      source: 'Primo Dialer',
      solicitorName: incoming.solicitorName || null
    };

    // 4. Activity Log (Notes): Save the Primo Disposition as the first note
    const notesArray = [];
    if (incoming.disposition || incoming.call_notes) {
      notesArray.push({
        text: `Lead Ingested. Outcome: ${incoming.disposition || 'N/A'}. Notes: ${incoming.call_notes || 'None'}`,
        time: new Date().toLocaleString('en-GB')
      });
    } else {
      notesArray.push({
        text: "Full profile data captured from Primo Dialer.",
        time: new Date().toLocaleString('en-GB')
      });
    }
    leadRecord.notes = notesArray;

    // 5. Insert into the database
    const { data, error } = await supabase
      .from('submissions')
      .insert([leadRecord]);

    if (error) {
      console.error("Supabase Database Error:", error);
      throw error;
    }

    // Success!
    console.log("Successfully saved Primo lead:", leadRecord.name);
    return res.status(200).json({ 
      success: true, 
      message: "Lead received and saved to dashboard",
      lead_name: leadRecord.name 
    });

  } catch (err) {
    console.error("Webhook Internal Error:", err.message);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error while saving lead.",
      details: err.message
    });
  }
};
