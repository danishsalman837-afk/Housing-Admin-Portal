const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { id, action, ...fields } = req.body;

    if (id && action === 'delete') {
        const { error } = await supabase.from('companies').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }

    if (id) {
        // Update existing
        const { data, error } = await supabase
            .from('companies')
            .update(fields)
            .eq('id', id)
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    } else {
        // Create new
        const { data, error } = await supabase
            .from('companies')
            .insert([fields])
            .select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
