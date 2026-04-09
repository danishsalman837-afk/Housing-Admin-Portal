const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;

  try {
    const { action, id, ...fields } = req.body;
    const resourceType = req.query.type || req.body.resourceType; 

    // ═════════════════════════════════════════════════
    // CRUD: COMPANIES (Matched to your 'companies' table)
    // ═════════════════════════════════════════════════
    if (resourceType === 'company' || req.url.includes('companies')) {
      if (method === 'GET') {
        const { data, error } = await supabase.from('companies').select('*').order('name');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data || []);
      }
      
      if (method === 'POST') {
        if (id && action === 'delete') {
          const { error } = await supabase.from('companies').delete().eq('id', id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (id) {
          const { data, error } = await supabase.from('companies').update(fields).eq('id', id).select();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json(data[0]);
        }
        const { data, error } = await supabase.from('companies').insert([fields]).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
      }
    }

    // ═════════════════════════════════════════════════
    // CRUD: MEMBERS (Matched to your 'company_members' table)
    // ═════════════════════════════════════════════════
    if (resourceType === 'member' || req.url.includes('members')) {
      if (method === 'POST') {
        if (id && action === 'delete') {
          const { error } = await supabase.from('company_members').delete().eq('id', id);
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json({ success: true });
        }
        if (id) {
          const { data, error } = await supabase.from('company_members').update(fields).eq('id', id).select();
          if (error) return res.status(500).json({ error: error.message });
          return res.status(200).json(data[0]);
        }
        const { data, error } = await supabase.from('company_members').insert([fields]).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
      }
      if (method === 'GET') {
        const { data, error } = await supabase.from('company_members').select('*');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data || []);
      }
    }

    return res.status(405).json({ error: 'Method Not Allowed or Invalid Resource Type' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
};
