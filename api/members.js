const { createSupabaseClient, assertEnv } = require("./supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');

  if (req.method === 'GET') {
    const { company_id } = req.query;

    let query = supabase.from('company_members').select('*').order('first_name', { ascending: true });
    
    if (company_id) {
        query = query.eq('company_id', company_id);
    }
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { id, action, ...fields } = req.body;

    if (id && action === 'delete') {
        const { error } = await supabase.from('company_members').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }

    if (id) {
        // Update existing member
        const { data, error } = await supabase
            .from('company_members')
            .update(fields)
            .eq('id', id)
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    } else {
        // Create new member
        const { data, error } = await supabase
            .from('company_members')
            .insert([fields])
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
