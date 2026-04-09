const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  try {
    const data = req.body;
    console.log("Receiving Lead:", data);

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

    let resultData;
    let resultMessage;

    if (isUpdate) {
      const updateData = { ...data };
      delete updateData.id;

      const { data: updated, error: updateError } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', existingId)
        .select();

      if (updateError) {
        console.error("Supabase Error (Update):", updateError.message);
        return res.status(500).json({ success: false, error: updateError.message });
      }

      resultData = updated[0];
      resultMessage = "Lead updated successfully";
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('submissions')
        .insert([data])
        .select();

      if (insertError) {
        console.error("Supabase Error (Insert):", insertError.message);
        return res.status(500).json({ success: false, error: insertError.message });
      }

      resultData = inserted[0];
      resultMessage = "Lead saved successfully";
    }

    return res.status(200).json({ success: true, message: resultMessage, detail: resultData });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Server Crashed." });
  }
};
