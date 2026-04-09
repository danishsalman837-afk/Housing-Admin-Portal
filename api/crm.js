const { createSupabaseClient, assertEnv } = require("./_supabaseClient");

module.exports = async function handler(req, res) {
  if (!assertEnv('service', res)) return;
  const supabase = createSupabaseClient('service');
  const method = req.method;

  try {
    const { action, id, ...fields } = req.body || {};
    // Resource detection: prioritize query string, fallback to body
    const resourceType = req.query.type || (req.body && req.body.resourceType);

    // 1. Logic for COMPANIES
    if (resourceType === 'company' || req.url.toLowerCase().includes('companies')) {
      if (method === 'GET') {
        const { data, error } = await supabase.from('companies').select('*').order('name');
        if (error) throw error;
        return res.status(200).json(data || []);
      }
      if (method === 'POST') {
        if (id && action === 'delete') {
          const { error } = await supabase.from('companies').delete().eq('id', id);
          if (error) throw error;
          return res.status(200).json({ success: true });
        }
        if (id) {
          const { data, error } = await supabase.from('companies').update(fields).eq('id', id).select();
          if (error) throw error;
          return res.status(200).json(data[0] || {});
        }
        const { data, error } = await supabase.from('companies').insert([fields]).select();
        if (error) throw error;
        return res.status(200).json(data[0] || {});
      }
    }

    // 2. Logic for MEMBERS
    if (resourceType === 'member' || req.url.toLowerCase().includes('members')) {
      if (method === 'GET') {
        const { data, error } = await supabase.from('company_members').select('*');
        if (error) throw error;
        return res.status(200).json(data || []);
      }
      if (method === 'POST') {
        if (id && action === 'delete') {
          const { error } = await supabase.from('company_members').delete().eq('id', id);
          if (error) throw error;
          return res.status(200).json({ success: true });
        }
        if (id) {
          const { data, error } = await supabase.from('company_members').update(fields).eq('id', id).select();
          if (error) throw error;
          return res.status(200).json(data[0] || {});
        }
        const { data, error } = await supabase.from('company_members').insert([fields]).select();
        if (error) throw error;
        return res.status(200).json(data[0] || {});
      }
    }

    return res.status(400).json({ error: 'Invalid request: ' + resourceType });
  } catch (err) {
    console.error("CRM API Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
