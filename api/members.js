const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const { data, error } = await supabase
      .from('company_members')
      .select('*')
      .eq('company_id', company_id)
      .order('first_name', { ascending: true });
    
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
